# 📱 Cally - Smart Calendar Management (Mobile-Ready)

A unified calendar management system that seamlessly integrates Google Calendar, Jira tasks, and GitHub issues into one streamlined interface. Now available as both a web app and native mobile app!

## 🌟 Features

### 📅 **Unified Calendar View**
- **Multi-source integration**: Google Calendar, Jira tasks, GitHub issues
- **Real-time synchronization** with automatic updates
- **Smart conflict detection** and resolution
- **Cross-platform availability**: Web, iOS, and Android

### 🔗 **Seamless Integrations**
- **Google Calendar**: Full bidirectional sync with multiple calendars
- **Jira**: Automatic task-to-event conversion with status tracking
- **GitHub**: Issue deadline integration with priority management
- **Manual Events**: Create custom events with rich metadata

### 📱 **Mobile-First Design**
- **Native mobile apps** via Capacitor
- **Progressive Web App (PWA)** capabilities
- **Offline functionality** with local caching
- **Touch-optimized interface** for mobile devices
- **Push notifications** for upcoming events

### 🎯 **Smart Features**
- **Intelligent scheduling** with AI-powered suggestions
- **Recurring pattern detection** for automated event creation
- **Working hours optimization** and break scheduling
- **Multi-event operations** with bulk actions
- **Advanced filtering** by source, date, and priority

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Console project (for calendar integration)
- Jira Cloud instance (optional)
- GitHub account (optional)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Web Application Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/cally.git
   cd cally
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. **Environment Configuration**
   ```bash
   # Backend (.env)
   cp backend/.env.example backend/.env
   # Configure your API keys and database settings
   
   # Frontend (.env)
   cp frontend/.env.example frontend/.env
   # Configure your frontend settings
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

### 📱 Mobile App Development

#### Install Dependencies
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

#### Initialize Capacitor
```bash
# Build the web app first
npm run build

# Initialize Capacitor (if not already done)
npx cap init

# Add mobile platforms
npx cap add ios
npx cap add android
```

#### iOS Development
```bash
# Sync web assets to iOS
npm run cap:build

# Open in Xcode
npm run cap:open:ios

# Or run directly on device/simulator
npm run cap:run:ios
```

#### Android Development
```bash
# Sync web assets to Android
npm run cap:build

# Open in Android Studio
npm run cap:open:android

# Or run directly on device/emulator
npm run cap:run:android
```

## 📱 Mobile App Features

### 🔧 **Native Capabilities**
- **Status bar styling** that matches app theme
- **Keyboard handling** with proper viewport adjustments
- **Hardware back button** support (Android)
- **App state management** for background/foreground transitions
- **Safe area handling** for modern iOS devices

### 🌐 **PWA Features**
- **Installable** from browser (Add to Home Screen)
- **Offline caching** with service workers
- **App shortcuts** for quick actions
- **Full-screen mode** without browser UI
- **Cross-platform compatibility**

### 📱 **Mobile Optimizations**
- **Touch-friendly** button sizes (44px minimum)
- **Mobile-first responsive design**
- **Optimized calendar views** for small screens
- **Swipe gestures** for navigation
- **Pull-to-refresh** functionality

## 🏗️ Architecture

### Frontend (React + Capacitor)
```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API communication
│   └── styles/           # Global styles and themes
├── public/
│   ├── manifest.json     # PWA manifest
│   ├── sw.js            # Service worker
│   └── icons/           # App icons
├── ios/                 # iOS native project
├── android/             # Android native project
└── capacitor.config.js  # Capacitor configuration
```

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   └── middleware/      # Express middleware
├── config/              # Configuration files
└── migrations/          # Database migrations
```

## 🔧 Available Scripts

### Web Development
```bash
npm start              # Start development server
npm run build          # Build for production
npm test              # Run tests
```

### Mobile Development
```bash
# Capacitor commands
npm run cap:build      # Build web app and sync to mobile
npm run cap:sync       # Sync web assets to mobile platforms
npm run cap:open:ios   # Open iOS project in Xcode
npm run cap:open:android # Open Android project in Android Studio
npm run cap:run:ios    # Build and run on iOS device/simulator
npm run cap:run:android # Build and run on Android device/emulator
```

## 🌍 Deployment

### Web App Deployment
- **Vercel**: Automatic deployment from GitHub
- **Netlify**: Static site hosting with build automation
- **Custom**: Any static file server

### Mobile App Deployment
- **iOS App Store**: Build with Xcode and submit via App Store Connect
- **Google Play Store**: Build with Android Studio and upload AAB
- **Enterprise**: Distribute via internal app stores or direct installation

### PWA Deployment
- Deploy web app to HTTPS domain
- Ensure manifest.json and service worker are accessible
- Test installation on various devices

## 📊 Current Development Status

### ✅ **Completed Features**
- ✅ Core calendar functionality
- ✅ Google Calendar integration
- ✅ Jira task integration
- ✅ GitHub issue integration
- ✅ User authentication & authorization
- ✅ Real-time sync capabilities
- ✅ Mobile-responsive design
- ✅ Capacitor mobile app setup
- ✅ PWA functionality
- ✅ Dark mode support

### 🚧 **In Progress - Phase 10: Mobile Application**
- 🔨 **Week 1-2**: Enhanced mobile UI/UX
- 🔨 **Week 3-4**: Native mobile features (notifications, camera, etc.)
- 🔨 **Week 5-6**: App store optimization and deployment

### 🔮 **Upcoming - Phase 11: Advanced Features**
- 📝 Enhanced drag & drop with multi-event selection
- 🤖 AI-powered scheduling suggestions
- 🔄 Recurring pattern detection
- 📊 Workload analysis and optimization
- 🎯 Advanced conflict resolution

## 🔐 Security

- **OAuth 2.0** for secure third-party integrations
- **JWT tokens** for authentication
- **HTTPS-only** in production
- **API rate limiting** and request validation
- **Mobile app security** with Capacitor's security features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📱 Mobile Development Notes

### iOS Requirements
- Xcode 14.0 or later
- iOS 13.0+ deployment target
- Apple Developer account (for device testing and App Store distribution)

### Android Requirements
- Android Studio 2022.1.1 or later
- Android SDK 23+ (Android 6.0+)
- Java 11 or later

### Testing on Devices
```bash
# iOS Simulator
npm run cap:run:ios --target="iPhone 14"

# Android Emulator
npm run cap:run:android --target="Pixel_5_API_30"

# Physical devices (ensure devices are connected and developer mode enabled)
npm run cap:run:ios --target="Your iPhone"
npm run cap:run:android --target="Your Android"
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@cally.app
- 💬 Discord: [Join our community](https://discord.gg/cally)
- 📖 Documentation: [docs.cally.app](https://docs.cally.app)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/cally/issues)

---

**Made with ❤️ for productivity enthusiasts and teams who want to stay organized across all their tools.**
