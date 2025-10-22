const postService = require("./post.service");
const { asyncHandler, ValidationError } = require("../../middlewares/errorHandler.middleware");
const logger = require("../../config/logger");

class PostController {
    upload = asyncHandler(async (req, res) => {
        const { name, description } = req.body;
        const file = req.file;

        logger.info('Upload request received', {
            requestId: req.id,
            name,
            hasFile: !!file,
        });

        if (!file) {
            throw new ValidationError('No file uploaded');
        }

        const post = await postService.uploadMedia(file, name, description, req.id);

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: post,
            requestId: req.id,
        });
    });

    getPosts = asyncHandler(async (req, res) => {
        logger.info('Get posts request received', {
            requestId: req.id,
        });

        const posts = await postService.getAllPosts(req.id);

        const minimal = posts.map(p => ({
            _id: p._id || p.id,
            name: p.name,
            description: p.description,
            fileUrl: p.fileUrl
        }));

        return res.status(200).json(minimal);
    });

    deletePost = asyncHandler(async (req, res) => {
        const { id } = req.params;

        logger.info('Delete post request received', {
            requestId: req.id,
            postId: id,
        });

        const result = await postService.deletePost(id, req.id);

        res.status(200).json({
            success: true,
            ...result,
            requestId: req.id,
        });
    });
}

module.exports = new PostController();