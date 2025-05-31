const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Task = sequelize.define('Task', {
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
  source: {
    type: DataTypes.ENUM('jira', 'github', 'manual'),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('issue', 'pull_request', 'task', 'bug', 'story', 'epic'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('lowest', 'low', 'medium', 'high', 'highest'),
    defaultValue: 'medium'
  },
  assignee: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reporter: {
    type: DataTypes.STRING,
    allowNull: true
  },
  labels: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  projectKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  repositoryName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['externalId', 'source'],
      unique: true
    },
    {
      fields: ['source']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = Task; 