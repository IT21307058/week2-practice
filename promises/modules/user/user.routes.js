const express = require('express');
const router = express.Router();
const authController = require('./user.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

// POST /auth/register - Register new user
router.post('/register', authController.register);

// POST /auth/login - Login user
router.post('/login', authController.login);

// GET /auth/me - Get current user (protected route)
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;