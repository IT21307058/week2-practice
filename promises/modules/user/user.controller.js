const userService = require("./user.service");

class AuthController {
    async register(req, res) {
        try {
            const { username, email, password } = req.body;

            // Validation
            if (!username || !email || !password) {
                return res.status(400).json({
                    message: 'Username, email and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    message: 'Password must be at least 6 characters'
                });
            }

            const result = await userService.register(username, email, password);
            res.status(201).json(result);
        } catch (err) {
            console.error(err);

            if (err.message === 'Email already registered' ||
                err.message === 'Username already taken') {
                return res.status(400).json({ message: err.message });
            }

            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    message: 'Email and password are required'
                });
            }

            const result = await userService.login(email, password);
            res.json(result);
        } catch (err) {
            console.error(err);

            if (err.message === 'Invalid email or password') {
                return res.status(401).json({ message: err.message });
            }

            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getMe(req, res) {
        try {
            const user = await userService.getUserById(req.userId);
            res.json(user);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new AuthController();