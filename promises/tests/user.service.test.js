const PATH_SERVICE = '../modules/user/user.service';
// const PATH_REPO = '../../src/modules/user/user.repository';
const PATH_LOGGER = '../config/logger';

// tests/user.service.test.js
process.env.JWT_SECRET = 'testsecret';

jest.mock('../config/logger');
jest.mock('../modules/user/user.repository', () => ({
    findUserByEmail: jest.fn(),
    findUserByUsername: jest.fn(),
    createUser: jest.fn(),
    findUserById: jest.fn(),
}), { virtual: true });

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require(PATH_LOGGER);
const userRepository = require('../modules/user/user.repository');
const { ValidationError, NotFoundError } = require('../middlewares/errorHandler.middleware');

const userService = require(PATH_SERVICE);


describe('UserService', () => {
    const requestId = 'req-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ---------- register ----------
    describe('register', () => {
        it('validates: username required', async () => {
            await expect(userService.register('  ', 'a@b.com', 'secret1', requestId))
                .rejects.toThrow(ValidationError);
        });

        it('validates: email required', async () => {
            await expect(userService.register('vic', '   ', 'secret1', requestId))
                .rejects.toThrow(ValidationError);
        });

        it('validates: password required', async () => {
            await expect(userService.register('vic', 'a@b.com', '', requestId))
                .rejects.toThrow(ValidationError);
        });

        it('validates: password min length', async () => {
            await expect(userService.register('vic', 'a@b.com', '123', requestId))
                .rejects.toThrow(ValidationError);
        });

        it('throws if email already registered', async () => {
            userRepository.findUserByEmail.mockResolvedValue({ id: 'u' });
            await expect(userService.register('vic', 'a@b.com', 'secret1', requestId))
                .rejects.toThrow(new ValidationError('Email already registered'));
        });

        it('throws if username already taken', async () => {
            userRepository.findUserByEmail.mockResolvedValue(null);
            userRepository.findUserByUsername.mockResolvedValue({ id: 'u' });
            await expect(userService.register('vic', 'a@b.com', 'secret1', requestId))
                .rejects.toThrow(new ValidationError('Username already taken'));
        });

        it('hashes, creates user, returns token', async () => {
            userRepository.findUserByEmail.mockResolvedValue(null);
            userRepository.findUserByUsername.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed_pw');
            userRepository.createUser.mockResolvedValue({ id: 'u1', username: 'vic', email: 'a@b.com' });
            jwt.sign.mockReturnValue('jwt-token');

            const res = await userService.register('vic', 'a@b.com', 'secret1', requestId);

            expect(userRepository.findUserByEmail).toHaveBeenCalledWith('a@b.com');
            expect(userRepository.findUserByUsername).toHaveBeenCalledWith('vic');
            expect(bcrypt.hash).toHaveBeenCalledWith('secret1', 10);
            expect(userRepository.createUser).toHaveBeenCalledWith({
                username: 'vic',
                email: 'a@b.com',
                password: 'hashed_pw',
            });
            expect(jwt.sign).toHaveBeenCalledWith({ userId: 'u1' }, 'testsecret', { expiresIn: '7d' });
            expect(res).toEqual({
                user: { id: 'u1', username: 'vic', email: 'a@b.com' },
                token: 'jwt-token',
            });
            expect(logger.info).toHaveBeenCalled();
        });

        it('logs and rethrows unexpected error', async () => {
            userRepository.findUserByEmail.mockRejectedValue(new Error('db fail'));
            await expect(userService.register('vic', 'a@b.com', 'secret1', requestId))
                .rejects.toThrow('db fail');
            expect(logger.error).toHaveBeenCalledWith(
                'Error in register',
                expect.objectContaining({ requestId, username: 'vic', email: 'a@b.com', error: 'db fail' })
            );
        });
    });

    // ---------- login ----------
    describe('login', () => {
        it('validates: email required', async () => {
            await expect(userService.login('   ', 'x', requestId)).rejects.toThrow(ValidationError);
        });

        it('validates: password required', async () => {
            await expect(userService.login('a@b.com', '', requestId)).rejects.toThrow(ValidationError);
        });

        it('throws on missing user', async () => {
            userRepository.findUserByEmail.mockResolvedValue(null);
            await expect(userService.login('a@b.com', 'secret1', requestId))
                .rejects.toThrow(new ValidationError('Invalid email or password'));
        });

        it('throws on invalid password', async () => {
            userRepository.findUserByEmail.mockResolvedValue({
                id: 'u1', username: 'vic', email: 'a@b.com', password: 'hashed',
            });
            bcrypt.compare.mockResolvedValue(false);
            await expect(userService.login('a@b.com', 'wrong', requestId))
                .rejects.toThrow(new ValidationError('Invalid email or password'));
        });

        it('returns user + token on success', async () => {
            userRepository.findUserByEmail.mockResolvedValue({
                id: 'u1', username: 'vic', email: 'a@b.com', password: 'hashed',
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwt-token-2');

            const res = await userService.login('a@b.com', 'secret1', requestId);

            expect(bcrypt.compare).toHaveBeenCalledWith('secret1', 'hashed');
            expect(jwt.sign).toHaveBeenCalledWith({ userId: 'u1' }, 'testsecret', { expiresIn: '7d' });
            expect(res).toEqual({
                user: { id: 'u1', username: 'vic', email: 'a@b.com' },
                token: 'jwt-token-2',
            });
            expect(logger.info).toHaveBeenCalled();
        });

        it('logs and rethrows unexpected error', async () => {
            userRepository.findUserByEmail.mockRejectedValue(new Error('db down'));
            await expect(userService.login('a@b.com', 'secret1', requestId))
                .rejects.toThrow('db down');
            expect(logger.error).toHaveBeenCalledWith(
                'Error in login',
                expect.objectContaining({ requestId, email: 'a@b.com', error: 'db down' })
            );
        });
    });

    // ---------- verifyToken ----------
    describe('verifyToken', () => {
        it('returns payload when token valid', () => {
            jwt.verify.mockReturnValue({ userId: 'u1' });
            const payload = userService.verifyToken('good');
            expect(jwt.verify).toHaveBeenCalledWith('good', 'testsecret');
            expect(payload).toEqual({ userId: 'u1' });
        });

        it('throws ValidationError on invalid token', () => {
            jwt.verify.mockImplementation(() => { throw new Error('bad'); });
            expect(() => userService.verifyToken('bad')).toThrow(ValidationError);
        });
    });

    // ---------- getUserById ----------
    describe('getUserById', () => {
        it('validates: id required', async () => {
            await expect(userService.getUserById('', requestId)).rejects.toThrow(ValidationError);
        });

        it('throws NotFoundError if missing', async () => {
            userRepository.findUserById.mockResolvedValue(null);
            await expect(userService.getUserById('nope', requestId))
                .rejects.toThrow(NotFoundError);
        });

        it('returns minimal user fields', async () => {
            userRepository.findUserById.mockResolvedValue({
                id: 'u1', username: 'vic', email: 'a@b.com', password: 'hashed',
            });

            const u = await userService.getUserById('u1', requestId);

            expect(userRepository.findUserById).toHaveBeenCalledWith('u1');
            expect(u).toEqual({ id: 'u1', username: 'vic', email: 'a@b.com' });
            expect(logger.info).toHaveBeenCalled();
        });

        it('logs and rethrows unexpected error', async () => {
            userRepository.findUserById.mockRejectedValue(new Error('db err'));
            await expect(userService.getUserById('u1', requestId)).rejects.toThrow('db err');
            expect(logger.error).toHaveBeenCalledWith(
                'Error in getUserById',
                expect.objectContaining({ requestId, userId: 'u1', error: 'db err' })
            );
        });
    });
});