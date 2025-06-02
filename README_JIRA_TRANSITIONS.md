# Jira Dynamic Status Transitions

## Overview

The system now supports dynamic Jira status transitions that come directly from your Jira project's workflow, instead of using hardcoded status values. This allows you to move Jira tasks through their actual workflow states directly from the **Tasks tab** interface.

## Features

### 🔄 Dynamic Status Transitions
- **Real-time workflow loading**: Fetches available transitions from your actual Jira project workflow
- **Project-specific states**: Each Jira project can have different statuses (To Do, In Progress, Code Review, Testing, Done, etc.)
- **Contextual transitions**: Only shows transitions that are actually available for the current issue status

### 🎯 How It Works

1. **Navigate to Tasks**: Go to the "Tasks & Issues" tab in the main navigation
2. **View Tasks**: See all your Jira tasks across connected accounts
3. **Expand Task**: Click "Show Details" on any task to view more information
4. **Status Transition**: In the expanded view, see current status and available transitions
5. **Select Transition**: Click on any available transition button like:
   - "Start Progress" → moves to "In Progress"
   - "Ready for Review" → moves to "Code Review"
   - "Mark as Done" → moves to "Done"
6. **Automatic Update**: The Jira issue status updates immediately
7. **Auto-deletion**: If moved to "Done", any linked calendar events are automatically removed

### 🛠 Technical Implementation

#### Frontend (Tasks.js)
```javascript
// Load available transitions when task is expanded
const loadTaskTransitions = async (issueKey) => {
  const response = await accountService.getJiraIssueTransitions(
    issue.accountId, 
    issueKey
  );
  setTaskTransitions(prev => ({ ...prev, [issueKey]: response.transitions }));
};

// Handle transition selection
const handleStatusTransition = async (issueKey, transitionId) => {
  await accountService.updateJiraIssueStatus(
    issue.accountId,
    issueKey,
    transitionId
  );
  // Update local state and reload transitions
};
```

#### Backend API Endpoints
- `GET /api/jira/issues/:accountId/:issueKey/transitions` - Fetch available transitions
- `PUT /api/jira/issues/:accountId/:issueKey/status` - Execute transition

#### Enhanced Task View
- **Expandable tasks**: Click "Show Details" to expand each task
- **Task details**: View description, assignee, reporter, creation date
- **Current status display**: Shows current status with appropriate color coding
- **Transition buttons**: Interactive buttons for each available workflow transition
- **Loading states**: Visual feedback during transition loading and execution
- **Real-time updates**: Status changes reflect immediately in the interface

### 🔧 Benefits

1. **No Hardcoding**: Works with any Jira project regardless of custom workflow
2. **Always Current**: Reflects your actual project workflow states
3. **Permission Aware**: Only shows transitions the user is allowed to make
4. **Automatic Cleanup**: Completed tasks automatically remove linked calendar events
5. **Real-time Updates**: Changes reflect immediately in both Jira and task list
6. **Dedicated Interface**: Proper task management UI separate from calendar events

### 📋 Usage Example

**Tasks Tab Interface**:
1. Navigate to "Tasks & Issues" tab
2. See list of all your Jira tasks with current status
3. Click "Show Details" on "DEMO-123: Fix login bug"
4. Expanded view shows:
   - **Current Status**: "To Do" 
   - **Available Transitions**:
     - "Start Progress" → "In Progress"
     - "Assign to Backlog" → "Backlog"

5. Click "Start Progress" button
6. Status immediately updates to "In Progress"
7. New transitions appear:
   - "Ready for Review" → "Code Review"
   - "Stop Work" → "To Do"
   - "Complete" → "Done"

### 🚀 Getting Started

1. **Connect Jira Account**: Ensure your Jira account is connected in Settings
2. **Navigate to Tasks**: Go to the "Tasks & Issues" tab
3. **View Your Tasks**: See all tasks from connected Jira accounts
4. **Expand Task Details**: Click "Show Details" on any task you want to manage
5. **Use Dynamic Transitions**: Click on available workflow transition buttons
6. **Watch Real-time Updates**: See status changes immediately in both task list and Jira

### 🎨 UI Features

- **Clean Task Cards**: Each task shows key information (key, status, priority, title)
- **Expandable Details**: Toggle detailed view for each task
- **Color-coded Status**: Visual indicators for different status types
- **Interactive Transitions**: Clickable buttons for workflow transitions
- **Loading Indicators**: Spinner feedback during operations
- **Account Badges**: Shows which Jira account each task belongs to

This feature transforms the Tasks tab into a comprehensive project management interface where you can manage your entire Jira workflow without leaving the application! 