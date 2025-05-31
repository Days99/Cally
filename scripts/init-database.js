const sequelize = require('../backend/config/database');

// Import models to ensure they're registered
const models = require('../backend/src/models');

async function initDatabase() {
  try {
    console.log('🔄 Initializing fresh database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Create all tables and associations
    await sequelize.sync({ force: false });
    console.log('✅ Database tables and indexes created successfully.');
    
    console.log('📊 Database structure initialized:');
    console.log('  - users');
    console.log('  - tokens (with multi-account support)');
    console.log('  - calendar_events (with unified event schema)');
    console.log('  - tasks');
    console.log('  - task_assignments');
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('🚀 Ready for user registration and account connections!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('💡 Try running the reset script first or check your database connection.');
    process.exit(1);
  }
}

initDatabase(); 