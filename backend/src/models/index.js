const User = require('./User');
const Token = require('./Token');
const CalendarEvent = require('./CalendarEvent');
const Task = require('./Task');
const TaskAssignment = require('./TaskAssignment');

// Define associations
User.hasMany(Token, { foreignKey: 'userId', as: 'tokens' });
Token.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(CalendarEvent, { foreignKey: 'userId', as: 'calendarEvents' });
CalendarEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TaskAssignment, { foreignKey: 'userId', as: 'taskAssignments' });
TaskAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Task.hasMany(TaskAssignment, { foreignKey: 'taskId', as: 'assignments' });
TaskAssignment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

CalendarEvent.hasMany(TaskAssignment, { foreignKey: 'calendarEventId', as: 'taskAssignments' });
TaskAssignment.belongsTo(CalendarEvent, { foreignKey: 'calendarEventId', as: 'calendarEvent' });

Token.hasMany(CalendarEvent, { foreignKey: 'tokenId', as: 'calendarEvents' });
CalendarEvent.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

module.exports = {
  User,
  Token,
  CalendarEvent,
  Task,
  TaskAssignment
}; 