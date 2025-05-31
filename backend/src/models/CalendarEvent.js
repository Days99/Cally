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
  externalId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  calendarId: {
    type: DataTypes.STRING,
    allowNull: false
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
    comment: 'Cached account name for display (e.g., "Work", "Personal")'
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
    type: DataTypes.ENUM('confirmed', 'tentative', 'cancelled'),
    defaultValue: 'confirmed'
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
    allowNull: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'calendar_events',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['externalId', 'calendarId'],
      unique: true
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
      fields: ['userId', 'accountName']
    }
  ]
});

module.exports = CalendarEvent; 