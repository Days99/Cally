const sequelize = require('../backend/config/database');

// Import models to ensure they're registered
const models = require('../backend/src/models');

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    console.log('🗑️  Dropping all tables and constraints...');
    
    // Step 1: Drop all tables with CASCADE to handle foreign keys
    const tables = [
      'task_assignments',
      'tasks', 
      'calendar_events',
      'tokens',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`ℹ️  Table ${table} doesn't exist or already dropped`);
      }
    }
    
    // Step 2: Drop all custom enum types
    const enumTypes = [
      'calendar_event_type',
      'calendar_event_status',
      'calendar_event_status_new', 
      'calendar_event_priority',
      'task_status',
      'task_priority'
    ];
    
    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
        console.log(`✅ Dropped enum type: ${enumType}`);
      } catch (error) {
        console.log(`ℹ️  Enum type ${enumType} doesn't exist or already dropped`);
      }
    }
    
    // Step 3: Drop all indexes (in case any remain)
    try {
      await sequelize.query(`
        DO $$ 
        DECLARE 
          idx_name text;
        BEGIN 
          FOR idx_name IN 
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname NOT LIKE 'pg_%'
          LOOP 
            EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_name) || ' CASCADE;';
          END LOOP;
        END $$;
      `);
      console.log('✅ Dropped all custom indexes');
    } catch (error) {
      console.log('ℹ️  No custom indexes to drop');
    }
    
    // Step 4: Drop all sequences (auto-generated IDs)
    try {
      await sequelize.query(`
        DO $$ 
        DECLARE 
          seq_name text;
        BEGIN 
          FOR seq_name IN 
            SELECT sequencename FROM pg_sequences 
            WHERE schemaname = 'public'
          LOOP 
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(seq_name) || ' CASCADE;';
          END LOOP;
        END $$;
      `);
      console.log('✅ Dropped all sequences');
    } catch (error) {
      console.log('ℹ️  No sequences to drop');
    }
    
    console.log('🔄 Recreating database schema from scratch...');
    
    // Step 5: Force sync all models (this will recreate everything)
    await sequelize.sync({ force: true });
    
    console.log('✅ Database schema recreated successfully!');
    
    console.log('📊 Fresh database structure created:');
    console.log('  - users (clean table)');
    console.log('  - tokens (clean table with multi-account support)');
    console.log('  - calendar_events (clean table with unified event schema)');
    console.log('  - tasks (clean table)');
    console.log('  - task_assignments (clean table)');
    
    console.log('🎉 Database reset completed successfully!');
    console.log('💡 You can now:');
    console.log('   1. Register a new user account');
    console.log('   2. Connect Google Calendar');
    console.log('   3. Connect Jira');
    console.log('   4. Test the unified event creation system');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    console.error('💡 Check your database connection and permissions.');
    process.exit(1);
  }
}

resetDatabase(); 