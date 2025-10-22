/**
 * tests/post.service.test.js
 * Adjust relative paths if your structure differs.
 */
jest.mock('../modules/post/post.repository'); // <-- adjust relative path to this test file
jest.mock('../events/eventBus');
jest.mock('../events/post.events');
jest.mock('../config/logger');

const postRepository = require('../modules/post/post.repository'); // path to your file
const bus = require('../events/eventBus');
const POST = require('../events/post.events');
const logger = require('../config/logger');

// Import real error classes (don’t mock this module)
const {
    NotFoundError,
    ValidationError,
} = require('../middlewares/errorHandler.middleware');

// IMPORTANT: require the service AFTER mocks are set up
const PostService = require('../modules/post/post.service'); // path to your file

describe('PostService', () => {
    const requestId = 'req-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('uploadMedia', () => {
        const requestId = 'req-123';
        it('validates required inputs', async () => {
            await expect(
                PostService.uploadMedia(null, 'n', 'd', requestId)
            ).rejects.toThrow(ValidationError);

            const file = { originalname: 'a.png', size: 12, mimetype: 'image/png' };
            await expect(
                PostService.uploadMedia(file, '', 'd', requestId)
            ).rejects.toThrow(ValidationError);

            await expect(
                PostService.uploadMedia(file, 'n', '', requestId)
            ).rejects.toThrow(ValidationError);
        });

        it('saves file, saves post, emits event, returns post', async () => {
            const file = { originalname: 'a.png', size: 12, mimetype: 'image/png' };
            const savedFile = { _id: 'file1' };
            const savedPost = { _id: 'post1', id: 'post1', name: 'n', description: 'd', fileUrl: '/files/file1' };

            postRepository.saveFile.mockResolvedValue(savedFile);
            postRepository.savePost.mockResolvedValue(savedPost);

            const res = await PostService.uploadMedia(file, 'n', 'd', requestId);

            expect(postRepository.saveFile).toHaveBeenCalledWith(file);
            expect(postRepository.savePost).toHaveBeenCalledWith({
                name: 'n',
                description: 'd',
                fileUrl: '/files/file1',
            });

            expect(bus.emit).toHaveBeenCalledWith(POST.CREATED, {
                postId: 'post1',
                fileId: 'file1',
                name: 'n',
                requestId,
            });

            expect(logger.info).toHaveBeenCalled(); // a few times; we just assert it did log
            expect(res).toBe(savedPost);
        });

        it('logs and rethrows on unexpected error', async () => {
            const file = { originalname: 'a.png', size: 12, mimetype: 'image/png' };
            postRepository.saveFile.mockRejectedValue(new Error('db fail'));

            await expect(
                PostService.uploadMedia(file, 'n', 'd', requestId)
            ).rejects.toThrow('db fail');

            expect(logger.error).toHaveBeenCalledWith(
                'Error in uploadMedia',
                expect.objectContaining({ requestId, error: 'db fail' })
            );
        });
    });

    describe('getAllPosts', () => {
        it('returns posts with file data when available', async () => {
            // post documents with .toJSON()
            const posts = [
                {
                    _id: 'p1',
                    fileUrl: '/files/f1',
                    toJSON: () => ({ _id: 'p1', fileUrl: '/files/f1', name: 'A' }),
                },
                {
                    _id: 'p2',
                    fileUrl: '/files/f2',
                    toJSON: () => ({ _id: 'p2', fileUrl: '/files/f2', name: 'B' }),
                },
            ];

            const file1 = {
                _id: 'f1',
                filename: 'a.png',
                contentType: 'image/png',
                data: Buffer.from('hello'),
            };
            const file2 = {
                _id: 'f2',
                filename: 'b.png',
                contentType: 'image/png',
                data: Buffer.from('world'),
            };

            postRepository.getAllPosts.mockResolvedValue(posts);
            postRepository.getFileById
                .mockResolvedValueOnce(file1)
                .mockResolvedValueOnce(file2);

            const res = await PostService.getAllPosts(requestId);

            expect(postRepository.getAllPosts).toHaveBeenCalled();
            expect(postRepository.getFileById).toHaveBeenNthCalledWith(1, 'f1');
            expect(postRepository.getFileById).toHaveBeenNthCalledWith(2, 'f2');

            // Should embed base64 file data
            expect(res).toEqual([
                expect.objectContaining({
                    _id: 'p1',
                    file: expect.objectContaining({
                        _id: 'f1',
                        filename: 'a.png',
                        contentType: 'image/png',
                        data: expect.any(String),
                        url: '/files/f1',
                    }),
                }),
                expect.objectContaining({
                    _id: 'p2',
                    file: expect.objectContaining({
                        _id: 'f2',
                        filename: 'b.png',
                        contentType: 'image/png',
                        data: expect.any(String),
                        url: '/files/f2',
                    }),
                }),
            ]);
        });

        it('falls back to post JSON if file fetch fails', async () => {
            const posts = [
                {
                    _id: 'p1',
                    fileUrl: '/files/f1',
                    toJSON: () => ({ _id: 'p1', fileUrl: '/files/f1', name: 'A' }),
                },
            ];

            postRepository.getAllPosts.mockResolvedValue(posts);
            postRepository.getFileById.mockRejectedValue(new Error('nope'));

            const res = await PostService.getAllPosts(requestId);

            expect(logger.warn).toHaveBeenCalledWith(
                'Error fetching file for post',
                expect.objectContaining({
                    requestId,
                    postId: 'p1',
                    fileId: 'f1',
                    error: 'nope',
                })
            );
            expect(res).toEqual([{ _id: 'p1', fileUrl: '/files/f1', name: 'A' }]);
        });

        it('logs and rethrows on unexpected error', async () => {
            postRepository.getAllPosts.mockRejectedValue(new Error('db down'));
            await expect(PostService.getAllPosts(requestId)).rejects.toThrow('db down');
            expect(logger.error).toHaveBeenCalledWith(
                'Error in getAllPosts',
                expect.objectContaining({ requestId, error: 'db down' })
            );
        });
    });

    describe('deletePost', () => {
        it('throws NotFoundError if post missing', async () => {
            postRepository.getPostById.mockResolvedValue(null);

            await expect(PostService.deletePost('p1', requestId))
                .rejects.toThrow(NotFoundError);

            expect(logger.info).toHaveBeenCalledWith(
                'Starting post deletion',
                expect.objectContaining({ requestId, postId: 'p1' })
            );
        });

        it('deletes file (if present), deletes post, emits event, returns success', async () => {
            const post = { _id: 'p1', fileUrl: '/files/f1' };
            postRepository.getPostById.mockResolvedValue(post);
            postRepository.deleteFile.mockResolvedValue();
            postRepository.deletePostById.mockResolvedValue(1); // 1 row/doc deleted

            const res = await PostService.deletePost('p1', requestId);

            expect(postRepository.deleteFile).toHaveBeenCalledWith('f1');
            expect(postRepository.deletePostById).toHaveBeenCalledWith('p1');

            expect(bus.emit).toHaveBeenCalledWith(POST.DELETED, {
                postId: 'p1',
                fileId: 'f1',
                requestId,
            });

            expect(res).toEqual({ message: 'Post and file deleted successfully' });
        });

        it('continues if file deletion fails, still deletes post', async () => {
            const post = { _id: 'p1', fileUrl: '/files/f1' };
            postRepository.getPostById.mockResolvedValue(post);
            postRepository.deleteFile.mockRejectedValue(new Error('fs fail'));
            postRepository.deletePostById.mockResolvedValue(1);

            const res = await PostService.deletePost('p1', requestId);

            expect(logger.error).toHaveBeenCalledWith(
                'Error deleting file',
                expect.objectContaining({ requestId, fileId: 'f1', error: 'fs fail' })
            );
            expect(postRepository.deletePostById).toHaveBeenCalledWith('p1');
            expect(res).toEqual({ message: 'Post and file deleted successfully' });
        });

        it('throws NotFoundError if deletePostById returns 0', async () => {
            const post = { _id: 'p1', fileUrl: '/files/f1' };
            postRepository.getPostById.mockResolvedValue(post);
            postRepository.deleteFile.mockResolvedValue();
            postRepository.deletePostById.mockResolvedValue(0);

            await expect(PostService.deletePost('p1', requestId))
                .rejects.toThrow(NotFoundError);
        });

        it('logs and rethrows on unexpected error', async () => {
            postRepository.getPostById.mockRejectedValue(new Error('db bad'));
            await expect(PostService.deletePost('p1', requestId)).rejects.toThrow('db bad');
            expect(logger.error).toHaveBeenCalledWith(
                'Error in deletePost',
                expect.objectContaining({ requestId, postId: 'p1', error: 'db bad' })
            );
        });
    });
});
