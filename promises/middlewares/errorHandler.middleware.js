const logger = require('../config/logger');

// Custom Error Classes
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error with request context
    const errorLog = {
        requestId: req.id,
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        body: req.body,
        timestamp: new Date().toISOString(),
    };

    // Log based on severity
    if (err.statusCode >= 500) {
        logger.error('Server Error', errorLog);
    } else if (err.statusCode >= 400) {
        logger.warn('Client Error', errorLog);
    } else {
        logger.info('Error Handled', errorLog);
    }

    // Send error response
    const errorResponse = {
        status: err.status,
        message: err.message,
        requestId: req.id,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    // Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).json(errorResponse);
    }

    // Programming or unknown error: don't leak error details
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
        requestId: req.id,
    });
};

// 404 handler
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};

// Unhandled rejection handler
const unhandledRejectionHandler = () => {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', {
            reason: reason,
            promise: promise,
            stack: reason instanceof Error ? reason.stack : undefined,
        });

        // Optional: Exit process in production
        // process.exit(1);
    });
};

// Uncaught exception handler
const uncaughtExceptionHandler = () => {
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', {
            message: error.message,
            stack: error.stack,
        });

        // Exit process - uncaught exceptions should always terminate
        process.exit(1);
    });
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    asyncHandler,
    errorHandler,
    notFoundHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler,
};