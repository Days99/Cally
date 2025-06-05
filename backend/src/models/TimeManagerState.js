const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TimeManagerState = sequelize.define('TimeManagerState', {
  userId: {
    type: DataTypes.UUID,
    primaryKey: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  currentMainTaskId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'current_main_task_id',
    references: {
      model: 'task_sessions',
      key: 'id'
    }
  },
  currentSubTasks: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: 'current_sub_tasks',
    comment: 'Array of active sub-task session IDs'
  },
  lastActiveTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_active_time',
    comment: 'Last time user was active in time manager'
  },
  dailyStats: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'daily_stats',
    comment: 'Daily productivity statistics'
  },
  preferences: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      overrunThreshold: 60, // minutes
      autoStartMeetings: true,
      breakReminders: true,
      focusMode: false
    },
    comment: 'User preferences for time management'
  }
}, {
  tableName: 'time_manager_state',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['current_main_task_id']
    },
    {
      fields: ['last_active_time']
    }
  ]
});

// Define associations
TimeManagerState.associate = (models) => {
  TimeManagerState.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  TimeManagerState.belongsTo(models.TaskSession, {
    foreignKey: 'currentMainTaskId',
    as: 'currentMainTask'
  });
};

module.exports = TimeManagerState; 