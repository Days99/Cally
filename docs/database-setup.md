# Database Setup Guide

## PostgreSQL Setup for Cally

### 1. Create Database

Connect to PostgreSQL and create the database:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE cally;

-- Create user (optional, for security)
CREATE USER cally_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cally TO cally_user;

-- Exit psql
\q
```

### 2. Environment Configuration

Update your `backend/.env` file with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://cally_user:your_secure_password@localhost:5432/cally
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cally
DB_USER=cally_user
DB_PASSWORD=your_secure_password
```

### 3. Run Migration

From the project root directory:

```bash
cd backend
npm run migrate
```

### 4. Verify Setup

Check if tables were created:

```sql
-- Connect to the cally database
psql -U cally_user -d cally

-- List all tables
\dt

-- You should see:
-- users
-- tokens
-- calendar_events
-- tasks
-- task_assignments
```

### 5. Database Schema Overview

#### Users Table
- Stores user authentication and profile data
- Supports Google OAuth integration
- Includes user preferences and settings

#### Tokens Table
- Stores OAuth refresh tokens for Google, Jira, GitHub
- Manages API credentials securely
- Tracks token expiration and scopes

#### Calendar Events Table
- Caches Google Calendar events
- Supports recurring events
- Tracks sync status

#### Tasks Table
- Unified storage for Jira issues and GitHub items
- Supports different task types and priorities
- Includes metadata for source-specific data

#### Task Assignments Table
- Maps tasks to calendar time slots
- Supports scheduling and time tracking
- Handles recurring task assignments

### 6. Troubleshooting

#### Connection Issues
- Ensure PostgreSQL is running: `pg_ctl status`
- Check if database exists: `psql -l`
- Verify user permissions

#### Migration Errors
- Check database credentials in `.env`
- Ensure database is accessible
- Review error logs for specific issues

#### Performance Optimization
- Indexes are automatically created for common queries
- Consider connection pooling for production
- Monitor query performance with `EXPLAIN ANALYZE` 