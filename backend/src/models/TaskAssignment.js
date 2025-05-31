const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TaskAssignment = sequelize.define('TaskAssignment', {
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
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  calendarEventId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'calendar_events',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  scheduledStartTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  scheduledEndTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  estimatedDuration: {
    type: DataTypes.INTEGER, // minutes
    allowNull: true
  },
  actualDuration: {
    type: DataTypes.INTEGER, // minutes
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrencePattern: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'task_assignments',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['taskId']
    },
    {
      fields: ['scheduledDate']
    },
    {
      fields: ['status']
    },
    {
      fields: ['userId', 'scheduledDate']
    }
  ]
});

module.exports = TaskAssignment; 