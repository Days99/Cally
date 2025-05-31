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
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User-defined name for this account (e.g., "Work", "Personal")'
  },
  accountEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email associated with this account'
  },
  accountId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Provider-specific account identifier'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the primary account for this provider'
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
    defaultValue: {},
    comment: 'Additional provider-specific data'
  }
}, {
  tableName: 'tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'provider']
    },
    {
      fields: ['userId', 'provider', 'isPrimary']
    },
    {
      fields: ['provider', 'accountEmail']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Token; 