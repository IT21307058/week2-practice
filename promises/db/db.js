const { Sequelize, DataTypes } = require('sequelize');
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB,       // e.g., 'postgres_db'
  process.env.POSTGRES_USER,     // e.g., 'user'
  process.env.POSTGRES_PASSWORD, // e.g., 'password'
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: false, 
  }
);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL);
    console.log("MongoDB connection established");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  DataTypes,
  mongoose,
  connectDB,
};
