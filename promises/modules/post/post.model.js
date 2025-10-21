const { sequelize, DataTypes } = require('../../db/db');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    fileUrl: DataTypes.STRING,
    addedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'posts',
    timestamps: true,
});

module.exports = Post;
