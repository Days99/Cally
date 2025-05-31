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

    // STEP 2: Add unified event schema columns
    console.log('🔧 Adding unified event schema columns...');
    
    // Add eventType enum and column
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE calendar_event_type AS ENUM ('google_calendar', 'jira_task', 'github_issue', 'manual', 'outlook', 'teams');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "eventType" calendar_event_type DEFAULT 'manual';
      `);
      console.log('✅ eventType column added to calendar_events table');
    } catch (error) {
      console.log('ℹ️  eventType column already exists or not needed');
    }

    // Update status enum to include task statuses
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE calendar_event_status_new AS ENUM ('confirmed', 'tentative', 'cancelled', 'completed', 'in_progress', 'todo', 'done');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "status_new" calendar_event_status_new DEFAULT 'confirmed';
      `);
      
      await sequelize.query(`
        UPDATE calendar_events 
        SET "status_new" = CASE 
          WHEN status = 'confirmed' THEN 'confirmed'::calendar_event_status_new
          WHEN status = 'tentative' THEN 'tentative'::calendar_event_status_new  
          WHEN status = 'cancelled' THEN 'cancelled'::calendar_event_status_new
          ELSE 'confirmed'::calendar_event_status_new
        END;
      `);
      
      await sequelize.query(`
        ALTER TABLE calendar_events DROP COLUMN IF EXISTS status;
      `);
      
      await sequelize.query(`
        ALTER TABLE calendar_events RENAME COLUMN "status_new" TO status;
      `);
      
      console.log('✅ Updated status enum with task statuses');
    } catch (error) {
      console.log('ℹ️  Status enum update not needed or already done');
    }

    // Add priority column
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE calendar_event_priority AS ENUM ('highest', 'high', 'medium', 'low', 'lowest');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "priority" calendar_event_priority;
      `);
      console.log('✅ priority column added to calendar_events table');
    } catch (error) {
      console.log('ℹ️  priority column already exists or not needed');
    }

    // Add metadata, color, and syncStatus columns
    try {
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS "metadata" JSONB,
        ADD COLUMN IF NOT EXISTS "color" VARCHAR(7),
        ADD COLUMN IF NOT EXISTS "syncStatus" VARCHAR(20) DEFAULT 'manual';
      `);
      console.log('✅ metadata, color, and syncStatus columns added');
    } catch (error) {
      console.log('ℹ️  metadata/color/syncStatus columns already exist or not needed');
    }

    // Update externalId and calendarId to allow NULL for manual events
    try {
      await sequelize.query(`
        ALTER TABLE calendar_events 
        ALTER COLUMN "externalId" DROP NOT NULL,
        ALTER COLUMN "calendarId" DROP NOT NULL;
      `);
      console.log('✅ Made externalId and calendarId nullable for manual events');
    } catch (error) {
      console.log('ℹ️  externalId/calendarId nullable update not needed');
    }

    // Remove unique constraint on externalId+calendarId to allow duplicates from different types
    try {
      await sequelize.query(`
        DROP INDEX IF EXISTS calendar_events_external_id_calendar_id;
      `);
      console.log('✅ Removed unique constraint on externalId+calendarId');
    } catch (error) {
      console.log('ℹ️  Unique constraint already removed or not needed');
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

    // Set existing events as google_calendar type if they have google data
    try {
      await sequelize.query(`
        UPDATE calendar_events 
        SET "eventType" = 'google_calendar'
        WHERE "externalId" IS NOT NULL AND "calendarId" IS NOT NULL;
      `);
      console.log('✅ Updated existing events to google_calendar type');
    } catch (error) {
      console.log('ℹ️  Event type update not needed');
    }

    // STEP 3: Now sync all models (create tables and indexes)
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: false });
    console.log('✅ Database tables and indexes created successfully.');
    
    console.log('📊 Database structure:');
    console.log('  - users');
    console.log('  - tokens (with multi-account support)');
    console.log('  - calendar_events (with unified event schema)');
    console.log('  - tasks');
    console.log('  - task_assignments');
    
    console.log('🎉 Migration completed successfully!');
    console.log('🔗 Unified event creation system is now ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('💡 Try running the migration again or check your database connection.');
    process.exit(1);
  }
}

migrate(); 