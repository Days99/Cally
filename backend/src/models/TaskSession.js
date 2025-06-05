const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TaskSession = sequelize.define('TaskSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'event_id',
    references: {
      model: 'calendar_events',
      key: 'id'
    }
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_time'
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'estimated_duration',
    comment: 'Duration in minutes'
  },
  actualDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'actual_duration',
    comment: 'Duration in minutes'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'paused', 'overrun', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  },
  isMainTask: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_main_task'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User notes about the session'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional session metadata'
  }
}, {
  tableName: 'task_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['event_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['start_time']
    }
  ]
});

// Define associations
TaskSession.associate = (models) => {
  TaskSession.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  TaskSession.belongsTo(models.CalendarEvent, {
    foreignKey: 'eventId',
    as: 'event'
  });
};

module.exports = TaskSession; 