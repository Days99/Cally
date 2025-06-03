const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration with SSL support for production
let sequelizeConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL (for production environments like Render)
  sequelizeConfig = {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false // Important for some cloud providers
      } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
} else {
  // Use individual connection parameters (for development)
  sequelizeConfig = {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cally',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
}

const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, sequelizeConfig)
  : new Sequelize(sequelizeConfig);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err.message);
    if (err.message.includes('SSL') || err.message.includes('ssl')) {
      console.log('💡 Tip: Make sure SSL is properly configured for production databases.');
    }
  });

module.exports = sequelize; 