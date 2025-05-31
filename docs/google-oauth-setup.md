# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Cally" 
4. Click "Create"

## Step 2: Enable APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Google Calendar API**
   - **Google+ API** (for user info)
   - **People API** (for profile data)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: Cally
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/calendar.readonly`
   - `../auth/calendar.events`
5. Add test users (your email for testing)
6. Save and continue

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure:
   - **Name**: Cally Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - `http://localhost:3001`
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/auth/google/callback`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

Update your `backend/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# JWT Configuration (generate a secure secret)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=7d
```

Update your `frontend/.env` file:

```env
# Google OAuth Configuration
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Step 6: Generate JWT Secret

Generate a secure JWT secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

## Step 7: Test the Setup

1. Start your backend: `cd backend && npm run dev`
2. Start your frontend: `cd frontend && npm start`
3. Visit: `http://localhost:3000`
4. Click "Continue with Google"
5. Complete OAuth flow

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch"**
   - Check that redirect URI in Google Console matches exactly
   - Ensure no trailing slashes

2. **"invalid_client"**
   - Verify Client ID and Secret are correct
   - Check environment variables are loaded

3. **"access_denied"**
   - User cancelled or app not approved
   - Check OAuth consent screen configuration

4. **CORS errors**
   - Ensure JavaScript origins are configured
   - Check frontend URL is whitelisted

### Testing Checklist:

- [ ] Google Cloud project created
- [ ] APIs enabled (Calendar, Google+, People)
- [ ] OAuth consent screen configured
- [ ] Credentials created with correct redirect URIs
- [ ] Environment variables updated
- [ ] JWT secret generated
- [ ] Backend and frontend running
- [ ] Can access login page
- [ ] Google OAuth flow works
- [ ] User profile loads after login
- [ ] Can logout successfully

## Production Deployment

For production:

1. Update redirect URIs to production URLs
2. Remove test users and publish OAuth consent screen
3. Use secure JWT secrets
4. Enable HTTPS
5. Configure proper CORS origins

## API Scopes Explained

- `userinfo.email`: Access user's email address
- `userinfo.profile`: Access user's basic profile info
- `calendar.readonly`: Read calendar events
- `calendar.events`: Create/modify calendar events

## Next Steps

Once OAuth is working:
1. Implement Google Calendar integration (Phase 3)
2. Add Jira OAuth (Phase 4)
3. Add GitHub OAuth (Phase 5) 