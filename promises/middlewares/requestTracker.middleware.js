const { randomUUID } = require('node:crypto');
const logger = require('../config/logger');

// Middleware to add request ID and tracking
const requestTracker = (req, res, next) => {
    // Generate unique request ID
    req.id = randomUUID();
    req.startTime = Date.now();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.id);

    // Log incoming request
    logger.info('Incoming Request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        body: sanitizeBody(req.body),
    });

    // Capture the original res.json and res.send
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override res.json to log response
    res.json = function (data) {
        logResponse(req, res, data);
        return originalJson(data);
    };

    // Override res.send to log response
    res.send = function (data) {
        logResponse(req, res, data);
        return originalSend(data);
    };

    // Handle response finish event
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;

        logger.info('Request Completed', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
};

// Helper function to log response
function logResponse(req, res, data) {
    const duration = Date.now() - req.startTime;

    logger.info('Outgoing Response', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: JSON.stringify(data).length,
    });
}

// Helper function to sanitize sensitive data from body
function sanitizeBody(body) {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    });

    return sanitized;
}

module.exports = requestTracker;