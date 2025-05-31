const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Token = sequelize.define('Token', {
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
  provider: {
    type: DataTypes.ENUM('google', 'jira', 'github'),
    allowNull: false
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scope: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'provider'],
      unique: true
    },
    {
      fields: ['provider']
    }
  ]
});

module.exports = Token; 