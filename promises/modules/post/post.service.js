const postRepository = require("./post.repository");
const bus = require("../../events/eventBus");
const POST = require("../../events/post.events");
const logger = require("../../config/logger");
const { NotFoundError, ValidationError } = require("../../middlewares/errorHandler.middleware");

class PostService {

    async uploadMedia(file, name, description, requestId) {

        try {
            // Validation
            if (!file) {
                throw new ValidationError('No file provided');
            }

            if (!name || !description) {
                throw new ValidationError('Name and description are required');
            }

            logger.info('Starting media upload', {
                requestId,
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
            });

            // Sequential: do A → then B → then C (each waits for the previous).
            const savedFile = await postRepository.saveFile(file);
            logger.info('File saved to database', {
                requestId,
                fileId: savedFile._id,
            });

            const post = await postRepository.savePost({
                name,
                description,
                fileUrl: `/files/${savedFile._id}`,
            });
            logger.info('Post saved to database', {
                requestId,
                postId: post.id || post._id,
            });

            // Emit: post created
            bus.emit(POST.CREATED, {
                postId: post.id || post._id,
                fileId: savedFile._id,
                name,
                requestId,
            });

            logger.info('Media upload completed successfully', {
                requestId,
                postId: post.id || post._id,
            });

            return post;
        } catch (error) {
            logger.error('Error in uploadMedia', {
                requestId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async getAllPosts(requestId) {
        try {
            logger.info('Fetching all posts', { requestId });

            const posts = await postRepository.getAllPosts();
            logger.info('Posts retrieved from database', {
                requestId,
                count: posts.length,
            });

            const postsWithFiles = await Promise.all(
                posts.map(async (post) => {
                    const fileId = post.fileUrl.split('/files/')[1];

                    try {
                        const file = await postRepository.getFileById(fileId);

                        if (file) {
                            return {
                                ...post.toJSON(),
                                file: {
                                    _id: file._id,
                                    filename: file.filename,
                                    contentType: file.contentType,
                                    data: file.data.toString('base64'),
                                    url: post.fileUrl
                                }
                            };
                        }
                    } catch (err) {
                        logger.warn(`Error fetching file for post`, {
                            requestId,
                            postId: post._id,
                            fileId,
                            error: err.message,
                        });
                    }

                    return post.toJSON();
                })
            );

            logger.info('Posts with files processed', {
                requestId,
                totalPosts: postsWithFiles.length,
            });

            return postsWithFiles;
        } catch (error) {
            logger.error('Error in getAllPosts', {
                requestId,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async deletePost(id, requestId) {
        try {
            logger.info('Starting post deletion', {
                requestId,
                postId: id,
            });

            const post = await postRepository.getPostById(id);

            if (!post) {
                throw new NotFoundError('Post not found');
            }

            const fileId = post.fileUrl.split('/files/')[1];

            if (fileId) {
                try {
                    await postRepository.deleteFile(fileId);
                    logger.info('File deleted successfully', {
                        requestId,
                        fileId,
                    });
                } catch (err) {
                    logger.error('Error deleting file', {
                        requestId,
                        fileId,
                        error: err.message,
                    });
                }
            }

            const result = await postRepository.deletePostById(id);

            if (result === 0) {
                throw new NotFoundError('Post not found');
            }

            bus.emit(POST.DELETED, {
                postId: id,
                fileId,
                requestId
            });

            logger.info('Post deletion completed', {
                requestId,
                postId: id,
            });

            return { message: 'Post and file deleted successfully' };
        } catch (error) {
            logger.error('Error in deletePost', {
                requestId,
                postId: id,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}

module.exports = new PostService();