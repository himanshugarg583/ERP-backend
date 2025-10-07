const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',  
  logging: false,    
});

// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);

    
    // Log specific connection issues
    if (error.name === 'SequelizeConnectionRefusedError') {
      console.error('🔴 Connection refused - Check if MySQL server is running');
    } else if (error.name === 'SequelizeAccessDeniedError') {
      console.error('🔴 Access denied - Check database credentials');
    } else if (error.name === 'SequelizeHostNotFoundError') {
      console.error('🔴 Host not found - Check database host configuration');
    }
    
    process.exit(1); // Exit the application if database connection fails
  }
};

// Call the connection test
testConnection();

module.exports = sequelize;
