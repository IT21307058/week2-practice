const User = require("../user/user.model");

class UserRepository {
    async createUser(userData) {
        return await User.create(userData);
    }

    async findUserByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    async findUserByUsername(username) {
        return await User.findOne({ where: { username } });
    }

    async findUserById(id) {
        return await User.findByPk(id);
    }
}

module.exports = new UserRepository();