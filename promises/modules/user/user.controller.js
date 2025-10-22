
const userService = require("./user.service");
const logger = require("../../config/logger");

class AuthController {
    async register(req, res, next) {
        const requestId = req.id || `req-${Date.now()}`;

        try {
            const { username, email, password } = req.body;

            logger.info('Register request received', {
                requestId,
                username,
                email,
            });

            const result = await userService.register(username, email, password, requestId);

            logger.info('Register request completed successfully', {
                requestId,
                userId: result.user.id,
            });

            res.status(201).json(result);
        } catch (error) {
            logger.error('Register request failed', {
                requestId,
                error: error.message,
                stack: error.stack,
            });

            // Pass to error handling middleware
            next(error);
        }
    }

    async login(req, res, next) {
        const requestId = req.id || `req-${Date.now()}`;

        try {
            const { email, password } = req.body;

            logger.info('Login request received', {
                requestId,
                email,
            });

            const result = await userService.login(email, password, requestId);

            logger.info('Login request completed successfully', {
                requestId,
                userId: result.user.id,
            });

            res.json(result);
        } catch (error) {
            logger.error('Login request failed', {
                requestId,
                error: error.message,
                stack: error.stack,
            });

            // Pass to error handling middleware
            next(error);
        }
    }

    async getMe(req, res, next) {
        const requestId = req.id || `req-${Date.now()}`;

        try {
            logger.info('Get current user request received', {
                requestId,
                userId: req.userId,
            });

            const user = await userService.getUserById(req.userId, requestId);

            logger.info('Get current user request completed successfully', {
                requestId,
                userId: user.id,
            });

            res.json(user);
        } catch (error) {
            logger.error('Get current user request failed', {
                requestId,
                userId: req.userId,
                error: error.message,
                stack: error.stack,
            });

            // Pass to error handling middleware
            next(error);
        }
    }
}

module.exports = new AuthController();