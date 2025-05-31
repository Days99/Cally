const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      notifications: {
        email: true,
        browser: true
      }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['googleId']
    }
  ]
});

module.exports = User; 