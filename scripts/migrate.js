const sequelize = require('../backend/config/database');

// Import models with associations
const models = require('../backend/src/models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models (create tables)
    await sequelize.sync({ force: false });
    console.log('✅ Database tables created successfully.');
    
    // Add htmlLink column if it doesn't exist
    console.log('🔧 Adding missing columns...');
    try {
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "htmlLink" VARCHAR(255);
      `);
      console.log('✅ htmlLink column added to calendar_events table');
    } catch (error) {
      console.log('ℹ️  htmlLink column already exists or not needed');
    }
    
    console.log('📊 Created tables:');
    console.log('  - users');
    console.log('  - tokens');
    console.log('  - calendar_events');
    console.log('  - tasks');
    console.log('  - task_assignments');
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 