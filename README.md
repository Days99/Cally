# Cally - Unified Calendar & Task Management

A modern web application that integrates Google Calendar, Jira, and GitHub into a unified task scheduling and calendar management experience.

## 🎯 Project Overview

Cally allows users to:
- View Google Calendar events in a unified interface
- Manage Jira tasks with dynamic workflow transitions
- Create and link events across different platforms (Google Calendar, Jira, GitHub)
- Access from both mobile and desktop devices
- Real-time task status management using project-specific workflows

## 🚀 Current Features

- **Google Authentication** - OAuth 2.0 login with calendar access
- **Calendar View** - Interactive calendar powered by FullCalendar.js
- **Jira Integration** - Full OAuth integration with dynamic status transitions
- **Unified Event System** - Create events for Google Calendar, Jira tasks, or manual events
- **Tasks Management** - Dedicated Tasks tab with expandable task details
- **Dynamic Workflows** - Real Jira workflow transitions (no hardcoded statuses)
- **Multi-Account Support** - Connect multiple accounts per service
- **Real-time Sync** - Automatic status updates and calendar synchronization

## ✨ Key Features

### 🔄 Dynamic Jira Transitions
- **Project-specific workflows**: Uses actual Jira project workflows instead of hardcoded statuses
- **Real-time transitions**: Change task status using your project's actual workflow steps
- **Permission-aware**: Only shows transitions you're allowed to make
- **Auto-cleanup**: Completed tasks automatically remove linked calendar events

### 📅 Unified Event Creation
- **Multiple event types**: Google Calendar events, Jira tasks, GitHub issues, or manual events
- **Smart linking**: Link existing Jira issues to calendar events
- **Type-specific metadata**: Each event type stores relevant information
- **Cross-platform sync**: Changes sync across all connected platforms

### 🎯 Tasks Management
- **Expandable interface**: Click "Show Details" to see task information and available transitions
- **Status management**: View current status and available workflow transitions
- **Multi-account**: Manage tasks across all connected Jira accounts
- **Real-time updates**: Changes reflect immediately in both UI and Jira

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Tailwind CSS + FullCalendar.js |
| **Backend** | Node.js + Express |
| **Authentication** | OAuth 2.0 (Google, Jira, GitHub) |
| **Database** | PostgreSQL |
| **Hosting** | Vercel (Frontend) + Railway/Render (Backend) |

## 📁 Project Structure

```
cally/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # Tailwind CSS styles
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── config/             # Configuration files
│   └── package.json
├── docs/                   # Documentation
└── scripts/                # Build and deployment scripts
```

## 🔄 Development Phases

### Phase 1: Project Setup ✅
- [x] Repository structure
- [x] Basic documentation
- [x] Frontend React app initialization
- [x] Backend Express server setup
- [x] Database schema design

### Phase 2: Authentication & Authorization ✅
- [x] Google OAuth 2.0 implementation
- [x] JWT token management
- [x] Protected API routes
- [x] User session handling
- [x] Multi-account support

### Phase 3: Google Calendar Integration ✅
- [x] Google Calendar API setup
- [x] Calendar event fetching
- [x] FullCalendar.js implementation
- [x] Calendar view UI
- [x] Event creation and management

### Phase 4: Jira Integration ✅
- [x] Atlassian REST API integration
- [x] Jira OAuth 2.0 setup
- [x] Issue fetching and mapping
- [x] Dynamic workflow transitions
- [x] Task status management
- [x] Multi-account Jira support

### Phase 5: Unified Event System ✅
- [x] Dynamic event creation system
- [x] Event type management (Google Calendar, Jira, Manual)
- [x] Cross-platform event linking
- [x] Metadata storage and management
- [x] Auto-color coding by event type

### Phase 6: Advanced Task Management ✅
- [x] Dedicated Tasks tab interface
- [x] Expandable task details
- [x] Real-time status transitions
- [x] Project-specific workflow integration
- [x] Permission-aware transition display

### Phase 7: GitHub Integration 🔄
- [ ] GitHub REST API integration
- [ ] Issues and PR fetching
- [ ] Commit activity tracking
- [ ] GitHub OAuth setup

### Phase 8: Enhanced UI & UX 🔄
- [x] Responsive design with Tailwind CSS
- [ ] Advanced drag-and-drop functionality
- [ ] Mobile-optimized interface
- [ ] PWA support

### Phase 9: Data Synchronization & Performance
- [x] Real-time sync for Jira tasks
- [x] Automatic status cleanup
- [ ] Background sync jobs
- [ ] Webhook implementations
- [ ] Data consistency management

### Phase 10: Testing & Deployment
- [ ] Unit and integration tests
- [ ] Cross-device testing
- [ ] Production deployment
- [ ] CI/CD pipeline setup

## 🔧 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud Console project
- Jira and GitHub accounts for API access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cally.git
   cd cally
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   cd backend
   npm run migrate
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/cally
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

## 📊 Database Schema

### Core Tables
- `users` - User profiles and authentication data
- `tokens` - OAuth refresh tokens and API credentials
- `calendar_events` - Google Calendar events cache
- `tasks` - Unified tasks from Jira and GitHub
- `task_assignments` - Task-to-calendar slot mappings

## 🔮 Future Enhancements

- **AI-powered task suggestions** based on historical patterns
- **Slack/Discord integration** for team notifications
- **Pomodoro timer** and focus mode features
- **Priority tagging** system (high, medium, low)
- **Team collaboration** features
- **Advanced reporting** and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for better productivity and time management**
