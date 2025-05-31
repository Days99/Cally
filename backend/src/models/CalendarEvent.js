const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const CalendarEvent = sequelize.define('CalendarEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // Event type determines which integration this event belongs to
  eventType: {
    type: DataTypes.ENUM('google_calendar', 'jira_task', 'github_issue', 'manual', 'outlook', 'teams'),
    allowNull: false,
    defaultValue: 'manual',
    comment: 'Type of event - determines which service handles it'
  },
  // External ID from the source system (Google event ID, Jira issue key, etc.)
  externalId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID from external system (Google event ID, Jira key, GitHub issue number)'
  },
  // Calendar/Container ID in the source system
  calendarId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Calendar ID for Google Calendar events, Project key for Jira, Repository for GitHub'
  },
  tokenId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tokens',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Which account/token this event belongs to'
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cached account name for display (e.g., "Work Gmail", "Personal Jira")'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isAllDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  attendees: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('confirmed', 'tentative', 'cancelled', 'completed', 'in_progress', 'todo', 'done'),
    defaultValue: 'confirmed',
    comment: 'Event status - includes task statuses for Jira/GitHub events'
  },
  priority: {
    type: DataTypes.ENUM('highest', 'high', 'medium', 'low', 'lowest'),
    allowNull: true,
    comment: 'Priority level - mainly for task-type events'
  },
  visibility: {
    type: DataTypes.ENUM('default', 'public', 'private', 'confidential'),
    defaultValue: 'default'
  },
  recurrence: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  htmlLink: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Link to original event (Google Calendar, Jira issue, GitHub issue)'
  },
  // Flexible metadata for different event types
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Event-type specific data (e.g., Jira issue details, Google Meet links, GitHub assignees)'
  },
  // Color coding for different event types
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hex color code for calendar display'
  },
  // Sync tracking
  lastSyncAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  syncStatus: {
    type: DataTypes.ENUM('synced', 'pending', 'error', 'manual'),
    defaultValue: 'manual',
    comment: 'Sync status with external system'
  }
}, {
  tableName: 'calendar_events',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['eventType']
    },
    {
      fields: ['externalId', 'eventType'],
      unique: false // Allow multiple events with same external ID from different types
    },
    {
      fields: ['startTime', 'endTime']
    },
    {
      fields: ['tokenId']
    },
    {
      fields: ['userId', 'tokenId']
    },
    {
      fields: ['userId', 'eventType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = CalendarEvent; 