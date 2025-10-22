const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('./user.repository');
const logger = require('../../config/logger');
const { NotFoundError, ValidationError } = require('../../middlewares/errorHandler.middleware');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

class UserService {
    async register(username, email, password, requestId) {
        try {
            // Validate inputs first
            if (!username || !username.trim()) {
                throw new ValidationError('Username is required');
            }

            if (!email || !email.trim()) {
                throw new ValidationError('Email is required');
            }

            if (!password) {
                throw new ValidationError('Password is required');
            }

            if (password.length < 6) {
                throw new ValidationError('Password must be at least 6 characters');
            }

            logger.info('Starting user registration', {
                requestId,
                username,
                email,
            });

            // Check if user already exists
            const existingUser = await userRepository.findUserByEmail(email);
            if (existingUser) {
                throw new ValidationError('Email already registered');
            }

            const existingUsername = await userRepository.findUserByUsername(username);
            if (existingUsername) {
                throw new ValidationError('Username already taken');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            logger.info('Password hashed successfully', { requestId });

            // Create user
            const user = await userRepository.createUser({
                username,
                email,
                password: hashedPassword
            });

            logger.info('User created successfully', {
                requestId,
                userId: user.id,
                username: user.username,
            });

            // Generate token
            const token = this.generateToken(user.id);

            logger.info('Registration completed successfully', {
                requestId,
                userId: user.id,
            });

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            };
        } catch (error) {
            logger.error('Error in register', {
                requestId,
                username,
                email,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async login(email, password, requestId) {
        try {
            // Validate inputs first
            if (!email || !email.trim()) {
                throw new ValidationError('Email is required');
            }

            if (!password) {
                throw new ValidationError('Password is required');
            }

            logger.info('Starting user login', {
                requestId,
                email,
            });

            // Find user
            const user = await userRepository.findUserByEmail(email);
            if (!user) {
                throw new ValidationError('Invalid email or password');
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new ValidationError('Invalid email or password');
            }

            logger.info('User authenticated successfully', {
                requestId,
                userId: user.id,
            });

            // Generate token
            const token = this.generateToken(user.id);

            logger.info('Login completed successfully', {
                requestId,
                userId: user.id,
            });

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            };
        } catch (error) {
            logger.error('Error in login', {
                requestId,
                email,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    generateToken(userId) {
        return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            throw new ValidationError('Invalid token');
        }
    }

    async getUserById(id, requestId) {
        try {
            if (!id) {
                throw new ValidationError('User ID is required');
            }

            logger.info('Fetching user by ID', {
                requestId,
                userId: id,
            });

            const user = await userRepository.findUserById(id);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            logger.info('User retrieved successfully', {
                requestId,
                userId: id,
            });

            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            logger.error('Error in getUserById', {
                requestId,
                userId: id,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}

module.exports = new UserService();