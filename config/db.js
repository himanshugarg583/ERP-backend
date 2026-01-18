const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,   // 🔴 DB_PASS ❌ → DB_PASSWORD ✅
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, // 🔴 REQUIRED (52414)
    dialect: "mysql",
    logging: false,

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Railway ke liye required
      },
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error.message);
    process.exit(1);
  }
})();

module.exports = sequelize;
