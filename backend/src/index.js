const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import database and models
const sequelize = require('../config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Production-ready CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000', // For development
  'http://localhost:3001', // For development
  'https://cally.pt',      // Production domain
  'https://www.cally.pt',  // Production domain with www
  'https://cally-frontend.vercel.app' // Vercel deployment (if different)
];

// Add additional origins from environment variable if provided
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...additionalOrigins);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      console.log('🔧 Allowed origins:', allowedOrigins);
      console.log('🌍 Environment variables:');
      console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);
      console.log('   ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cally Backend API is running',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/events', require('./routes/events'));
app.use('/api/jira', require('./routes/jira'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/contact', require('./routes/contact'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🔄 Checking database connection and tables...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // For production with new databases, use force: true to avoid alter issues
    // For development, use alter: true for existing databases
    const isNewDatabase = process.env.FORCE_DB_SYNC === 'true' || process.env.NODE_ENV === 'production';
    const syncOptions = isNewDatabase 
      ? { force: true } // Clean slate - drops and recreates all tables
      : { alter: true }; // Try to alter existing tables
    
    console.log('🔄 Synchronizing database tables...');
    console.log(`📝 Sync mode: ${isNewDatabase ? 'FORCE (recreate all)' : 'ALTER (modify existing)'}`);
    
    await sequelize.sync(syncOptions);
    console.log('✅ Database tables synchronized.');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.message.includes('SSL') || error.message.includes('ssl')) {
      console.log('💡 SSL Error - Make sure NODE_ENV=production and DATABASE_URL is correct');
    }
    
    // If we get a syntax error during alter, try force sync
    if (error.message.includes('syntax error') || error.message.includes('USING')) {
      console.log('🔄 Syntax error detected, attempting force sync (recreate tables)...');
      try {
        await sequelize.sync({ force: true });
        console.log('✅ Database tables created successfully with force sync.');
        return true;
      } catch (forceError) {
        console.error('❌ Failed to create tables with force sync:', forceError.message);
        throw forceError;
      }
    }
    
    // If tables don't exist, try force sync
    if (error.message.includes('does not exist')) {
      console.log('🔄 Tables don\'t exist, attempting to create them...');
      try {
        await sequelize.sync({ force: true });
        console.log('✅ Database tables created successfully.');
        return true;
      } catch (forceError) {
        console.error('❌ Failed to create tables:', forceError.message);
        throw forceError;
      }
    }
    
    throw error;
  }
}

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Cally Backend API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Allowed origins:`, allowedOrigins);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the application
startServer(); 