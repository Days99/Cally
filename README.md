# Cally - Unified Calendar & Task Management

A modern web application that integrates Google Calendar, Jira, and GitHub into a unified task scheduling and calendar management experience.

## 🎯 Project Overview

Cally allows users to:
- View Google Calendar events in a unified interface
- Drag and drop Jira tasks and GitHub items onto calendar slots
- Save task-to-calendar assignments
- Access from both mobile and desktop devices

## 🚀 MVP Features

- **Google Authentication** - OAuth 2.0 login with calendar access
- **Calendar View** - Interactive calendar powered by FullCalendar.js
- **Jira Integration** - Read-only sync of user's issues and tasks
- **GitHub Integration** - Sync assigned issues, PRs, and commit activity
- **Task Scheduling** - Drag-and-drop task assignment to calendar slots
- **Unified Dashboard** - Combined task list and timeline view

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

### Phase 2: Authentication & Authorization
- [x] Google OAuth 2.0 implementation
- [ ] JWT token management
- [x] Protected API routes
- [ ] User session handling

### Phase 3: Google Calendar Integration
- [x] Google Calendar API setup
- [x] Calendar event fetching
- [x] FullCalendar.js implementation
- [x] Calendar view UI

### Phase 4: Jira Integration
- [ ] Atlassian REST API integration
- [ ] Issue fetching and mapping
- [ ] Task display in sidebar
- [ ] Jira OAuth setup

### Phase 5: GitHub Integration
- [ ] GitHub REST API integration
- [ ] Issues and PR fetching
- [ ] Commit activity tracking
- [ ] GitHub OAuth setup

### Phase 6: Task Assignment & UI
- [ ] Drag-and-drop functionality
- [ ] Task-to-calendar assignment logic
- [ ] Database persistence
- [ ] Color coding by source

### Phase 7: Data Synchronization
- [ ] Background sync jobs
- [ ] Webhook implementations
- [ ] Data consistency management
- [ ] Error handling and retry logic

### Phase 8: Mobile & Responsive Design
- [ ] Tailwind responsive breakpoints
- [ ] Touch-friendly drag and drop
- [ ] Mobile-optimized UI
- [ ] PWA support (optional)

### Phase 9: Testing & Deployment
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
