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
  'http://localhost:3000', // Frontend dev server
  'http://localhost:3001', // Backend dev server
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
    
    // For localhost development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return callback(null, true);
      }
    }
    
    // Remove trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    const normalizedAllowedOrigins = allowedOrigins.map(o => o.replace(/\/$/, ''));
    
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      console.log('🔧 Allowed origins:', allowedOrigins);
      console.log('🌍 Environment variables:');
      console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);
      console.log('   ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);
      console.log('   NODE_ENV:', process.env.NODE_ENV);
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
    
    // Check if core tables exist and have basic structure
    let tablesExist = false;
    let needsSync = false;
    
    try {
      // Check if core tables exist using a more comprehensive approach
      const tableCheckQueries = [
        "SELECT to_regclass('public.users') as table_exists",
        "SELECT to_regclass('public.tokens') as table_exists", 
        "SELECT to_regclass('public.calendar_events') as table_exists"
      ];
      
      const results = await Promise.all(
        tableCheckQueries.map(query => sequelize.query(query, { type: sequelize.QueryTypes.SELECT }))
      );
      
      // Check if all core tables exist
      tablesExist = results.every(result => result[0].table_exists !== null);
      
      if (tablesExist) {
        console.log('✅ Found existing tables: users, tokens, calendar_events');
        
        // Do a simple column check to see if tables need updates
        try {
          // Try to access key columns to verify table structure
          await sequelize.query("SELECT id, email FROM users LIMIT 1", { type: sequelize.QueryTypes.SELECT });
          await sequelize.query("SELECT id, user_id, provider FROM tokens LIMIT 1", { type: sequelize.QueryTypes.SELECT });
          await sequelize.query("SELECT id, user_id, title FROM calendar_events LIMIT 1", { type: sequelize.QueryTypes.SELECT });
          
          console.log('✅ Table structure verified - no sync needed');
          needsSync = false;
        } catch (columnError) {
          console.log('⚠️  Table structure needs updates:', columnError.message);
          needsSync = true;
        }
      } else {
        console.log('📝 Core tables missing - will create them');
        needsSync = true;
      }
      
    } catch (error) {
      console.log('⚠️  Could not check table existence:', error.message);
      tablesExist = false;
      needsSync = true;
    }
    
    // Determine sync strategy
    let syncOptions;
    let syncDescription;
    
    // Always force sync if explicitly requested
    if (process.env.FORCE_DB_SYNC === 'true') {
      syncOptions = { force: true };
      syncDescription = 'FORCE (explicit override via FORCE_DB_SYNC=true)';
      needsSync = true;
    } else if (!needsSync) {
      // Tables exist and structure is good - skip sync entirely
      console.log('⏭️  Database is up to date - skipping sync');
      return true;
    } else if (!tablesExist) {
      // No tables exist - safe to force create
      syncOptions = { force: true };
      syncDescription = 'FORCE (create all tables - new database)';
    } else {
      // Tables exist but need updates - use a conservative approach
      // Instead of ALTER (which causes syntax errors), we'll use force with a warning
      console.log('⚠️  Tables exist but need updates. For safety, we recommend backing up data first.');
      console.log('💡 To update safely, set FORCE_DB_SYNC=true after backing up data.');
      console.log('🔄 For now, attempting minimal sync...');
      
      // Try a minimal sync first (no force, no alter)
      try {
        await sequelize.sync({ });
        console.log('✅ Minimal sync completed successfully.');
        return true;
      } catch (syncError) {
        console.log('❌ Minimal sync failed:', syncError.message);
        
        // If minimal sync fails, force user to make explicit choice
        if (process.env.NODE_ENV === 'production') {
          console.error('🚨 PRODUCTION MODE: Cannot automatically recreate tables.');
          console.error('🚨 Please set FORCE_DB_SYNC=true to recreate tables (DATA WILL BE LOST)');
          console.error('🚨 Or fix the database schema manually.');
          throw new Error('Database schema update required in production');
        } else {
          console.log('🔄 Development mode: Attempting force sync...');
          syncOptions = { force: true };
          syncDescription = 'FORCE (development fallback after minimal sync failed)';
        }
      }
    }
    
    // Only perform sync if we determined we need it
    if (syncOptions) {
      console.log('🔄 Synchronizing database tables...');
      console.log(`📝 Sync mode: ${syncDescription}`);
      
      await sequelize.sync(syncOptions);
      console.log('✅ Database tables synchronized.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.message.includes('SSL') || error.message.includes('ssl')) {
      console.log('💡 SSL Error - Make sure NODE_ENV=production and DATABASE_URL is correct');
    }
    
    // More conservative error handling - don't automatically force sync
    if (error.message.includes('syntax error') || error.message.includes('USING')) {
      console.error('🚨 SQL Syntax Error: This indicates a Sequelize ALTER operation issue.');
      console.error('🚨 This often happens with enum columns or complex schema changes.');
      console.error('💡 Solutions:');
      console.error('   1. Set FORCE_DB_SYNC=true to recreate tables (DATA WILL BE LOST)');
      console.error('   2. Update your database schema manually');
      console.error('   3. Use a proper database migration tool');
      
      if (process.env.NODE_ENV !== 'production' && process.env.AUTO_FORCE_SYNC === 'true') {
        console.log('🔄 AUTO_FORCE_SYNC enabled in development - attempting force sync...');
        try {
          await sequelize.sync({ force: true });
          console.log('✅ Database tables created successfully with force sync.');
          return true;
        } catch (forceError) {
          console.error('❌ Failed to create tables with force sync:', forceError.message);
          throw forceError;
        }
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