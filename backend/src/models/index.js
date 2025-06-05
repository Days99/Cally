const User = require('./User');
const Token = require('./Token');
const CalendarEvent = require('./CalendarEvent');
const Task = require('./Task');
const TaskAssignment = require('./TaskAssignment');
const TaskSession = require('./TaskSession');
const TimeManagerState = require('./TimeManagerState');

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

// TimeManager associations
User.hasMany(TaskSession, { foreignKey: 'userId', as: 'taskSessions' });
TaskSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

CalendarEvent.hasMany(TaskSession, { foreignKey: 'eventId', as: 'taskSessions' });
TaskSession.belongsTo(CalendarEvent, { foreignKey: 'eventId', as: 'event' });

User.hasOne(TimeManagerState, { foreignKey: 'userId', as: 'timeManagerState' });
TimeManagerState.belongsTo(User, { foreignKey: 'userId', as: 'user' });

TaskSession.hasOne(TimeManagerState, { foreignKey: 'currentMainTaskId', as: 'activeState' });
TimeManagerState.belongsTo(TaskSession, { foreignKey: 'currentMainTaskId', as: 'currentMainTask' });

module.exports = {
  User,
  Token,
  CalendarEvent,
  Task,
  TaskAssignment,
  TaskSession,
  TimeManagerState
}; 