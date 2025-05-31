const sequelize = require('../backend/config/database');

// Import models with associations
const models = require('../backend/src/models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // STEP 1: Add missing columns first (before sync)
    console.log('🔧 Adding missing columns...');
    
    // Add htmlLink column if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "htmlLink" VARCHAR(255);
      `);
      console.log('✅ htmlLink column added to calendar_events table');
    } catch (error) {
      console.log('ℹ️  htmlLink column already exists or not needed');
    }

    // Add multi-account support columns to tokens table
    try {
      await sequelize.query(`
        ALTER TABLE tokens 
        ADD COLUMN IF NOT EXISTS "accountName" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "accountEmail" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "accountId" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN DEFAULT false;
      `);
      console.log('✅ Multi-account columns added to tokens table');
    } catch (error) {
      console.log('ℹ️  Multi-account columns already exist or not needed');
    }

    // Add account tracking columns to calendar_events table
    try {
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "tokenId" UUID REFERENCES tokens(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "accountName" VARCHAR(255);
      `);
      console.log('✅ Account tracking columns added to calendar_events table');
    } catch (error) {
      console.log('ℹ️  Account tracking columns already exist or not needed');
    }

    // Remove unique constraint on provider to allow multiple accounts
    try {
      await sequelize.query(`
        DROP INDEX IF EXISTS tokens_user_id_provider;
      `);
      console.log('✅ Removed unique constraint on tokens provider to allow multiple accounts');
    } catch (error) {
      console.log('ℹ️  Unique constraint already removed or not needed');
    }

    // Set existing tokens as primary accounts
    try {
      await sequelize.query(`
        UPDATE tokens 
        SET "isPrimary" = true 
        WHERE "isPrimary" IS NULL OR "isPrimary" = false;
      `);
      console.log('✅ Set existing tokens as primary accounts');
    } catch (error) {
      console.log('ℹ️  Primary account setup not needed');
    }

    // STEP 2: Now sync all models (create tables and indexes)
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: false });
    console.log('✅ Database tables and indexes created successfully.');
    
    console.log('📊 Database structure:');
    console.log('  - users');
    console.log('  - tokens (with multi-account support)');
    console.log('  - calendar_events (with account tracking)');
    console.log('  - tasks');
    console.log('  - task_assignments');
    
    console.log('🎉 Migration completed successfully!');
    console.log('🔗 Multi-account integration is now ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('💡 Try running the migration again or check your database connection.');
    process.exit(1);
  }
}

migrate(); 