const express = require("express");
const cors = require("cors");
require("dotenv").config();
const morgan = require('morgan');
const helmet = require('helmet');
const { sequelize, connectDB } = require("./db/db");
const postRoutes = require("./modules/post/post.routes");
const authRoutes = require("./modules/user/user.routes");
require("./subscribers/post.subscriber");
const logger = require("./config/logger");
const {
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
} = require("./middlewares/errorHandler.middleware");
const requestTracker = require("./middlewares/requestTracker.middleware");

const app = express();
const port = process.env.PORT || 8000;

// Setup global error handlers for unhandled errors
unhandledRejectionHandler();
uncaughtExceptionHandler();

// 1. Security middleware - FIRST
app.use(helmet());
app.use(cors());
// 3. Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Morgan HTTP request logger with Winston stream
app.use(morgan('combined', { stream: logger.stream }));

// 5. Request tracking middleware - CRITICAL for traceability
app.use(requestTracker);

// ============================================
// HEALTH CHECK & MONITORING
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id,
    database: {
      postgres: sequelize.authenticate() ? 'connected' : 'disconnected',
      mongodb: 'connected', // You can add actual MongoDB health check
    },
  });
});

app.get('/api/status', (req, res) => {
  res.status(200).json({
    service: 'Post Service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id,
  });
});

//routes
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);


// 404 handler - catches all unmatched routes
app.use(notFoundHandler);

// Global error handler - handles all errors
app.use(errorHandler);


module.exports = app;

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const port = process.env.PORT || 5000;
      app.listen(port, () => console.log(`Server started on port ${port}`));
    } catch (err) {
      console.error('Startup error:', err);
      process.exit(1);
    }
  })();
}
// module.exports = app;