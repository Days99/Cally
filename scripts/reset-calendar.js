const sequelize = require('../backend/config/database');

async function resetCalendarTable() {
  try {
    console.log('🚀 Starting calendar table reset...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    console.log('🗑️  Dropping calendar_events table...');
    await sequelize.query('DROP TABLE IF EXISTS calendar_events CASCADE;');
    console.log('✅ calendar_events table dropped.');

    console.log('🔨 Creating fresh calendar_events table...');
    await sequelize.query(`
      CREATE TABLE calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "externalId" VARCHAR(255) NOT NULL,
        "calendarId" VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isAllDay" BOOLEAN DEFAULT false,
        location VARCHAR(255),
        attendees JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
        visibility VARCHAR(20) DEFAULT 'default' CHECK (visibility IN ('default', 'public', 'private', 'confidential')),
        recurrence JSONB,
        "lastSyncAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('📊 Creating indexes...');
    await sequelize.query(`
      CREATE INDEX idx_calendar_events_user_id ON calendar_events("userId");
      CREATE UNIQUE INDEX idx_calendar_events_external_calendar ON calendar_events("externalId", "calendarId");
      CREATE INDEX idx_calendar_events_time_range ON calendar_events("startTime", "endTime");
      CREATE INDEX idx_calendar_events_last_sync ON calendar_events("lastSyncAt");
    `);

    console.log('✅ Fresh calendar_events table created with indexes!');
    
    // Verify table structure
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'calendar_events' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table structure:');
    console.table(results);

    console.log('\n🎉 Calendar table reset completed successfully!');
    console.log('💡 You can now sync your Google Calendar events fresh.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting calendar table:', error);
    process.exit(1);
  }
}

resetCalendarTable(); 