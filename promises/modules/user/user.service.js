const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../user/user.repository');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

class UserService {
    async register(username, email, password) {
        // Check if user already exists
        const existingUser = await userRepository.findUserByEmail(email);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const existingUsername = await userRepository.findUserByUsername(username);
        if (existingUsername) {
            throw new Error('Username already taken');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await userRepository.createUser({
            username,
            email,
            password: hashedPassword
        });

        // Generate token
        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        };
    }

    async login(email, password) {
        // Find user
        const user = await userRepository.findUserByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Generate token
        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token
        };
    }

    generateToken(userId) {
        return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            throw new Error('Invalid token');
        }
    }

    async getUserById(id) {
        const user = await userRepository.findUserById(id);
        if (!user) {
            throw new Error('User not found');
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email
        };
    }
}

module.exports = new UserService();