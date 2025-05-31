const sequelize = require('../backend/config/database');

// Import models to ensure they're registered
const models = require('../backend/src/models');

async function resetAndInitDatabase() {
  try {
    console.log('🔄 Starting complete database reset and initialization...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // ======================
    // RESET PHASE
    // ======================
    console.log('\n🗑️  PHASE 1: Resetting database...');
    
    // Step 1: Drop all tables with CASCADE to handle foreign keys
    const tables = [
      'task_assignments',
      'tasks', 
      'calendar_events',
      'tokens',
      'users'
    ];
    
    console.log('📋 Dropping tables...');
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
    
    console.log('🔢 Dropping enum types...');
    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
        console.log(`✅ Dropped enum type: ${enumType}`);
      } catch (error) {
        console.log(`ℹ️  Enum type ${enumType} doesn't exist or already dropped`);
      }
    }
    
    // Step 3: Drop all indexes (in case any remain)
    console.log('📇 Dropping indexes...');
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
    console.log('🔢 Dropping sequences...');
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
    
    console.log('✅ Reset phase completed successfully!');
    
    // ======================
    // INITIALIZATION PHASE
    // ======================
    console.log('\n🚀 PHASE 2: Initializing fresh database...');
    
    // Force sync all models (this will recreate everything from scratch)
    console.log('🔄 Creating fresh database schema...');
    await sequelize.sync({ force: true });
    
    console.log('✅ Database schema recreated successfully!');
    
    // ======================
    // COMPLETION
    // ======================
    console.log('\n📊 Fresh database structure created:');
    console.log('  ✅ users (clean table)');
    console.log('  ✅ tokens (clean table with multi-account support)');
    console.log('  ✅ calendar_events (clean table with unified event schema)');
    console.log('  ✅ tasks (clean table)');
    console.log('  ✅ task_assignments (clean table)');
    
    console.log('\n🎉 Database reset and initialization completed successfully!');
    console.log('🌟 Your Cally app is now ready with a fresh database!');
    console.log('\n💡 Next steps:');
    console.log('   1. 🔐 Register a new user account');
    console.log('   2. 📅 Connect Google Calendar');
    console.log('   3. 🎯 Connect Jira');
    console.log('   4. 🚀 Test the unified event creation system');
    console.log('   5. 📱 Enjoy your clean, fresh start!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database reset and initialization failed:', error);
    console.error('💡 Check your database connection and permissions.');
    console.error('🔧 Make sure PostgreSQL is running and accessible.');
    process.exit(1);
  }
}

resetAndInitDatabase(); 