# Fixing Google OAuth Forbidden Errors

## Problem
Google OAuth returns 403 Forbidden when trying to add accounts from pages with paths (like `/account`).

## Root Cause
Google OAuth has strict requirements for JavaScript origins and doesn't allow OAuth initiation from URLs with certain path structures.

## Solution 1: Update Google Console Configuration

### Step 1: Update JavaScript Origins
In your Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID:

**Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:3001
```

**Important:** Do NOT include paths like `/account` or `/dashboard`. Only include the base URLs.

**Authorized redirect URIs:**
```
http://localhost:3001/api/auth/google/callback
```

### Step 2: For Production
When deploying to production, add your production URLs:

**JavaScript origins:**
```
https://yourdomain.com
https://www.yourdomain.com
```

**Redirect URIs:**
```
https://yourdomain.com/api/auth/google/callback
```

## Solution 2: Client-Side OAuth Handling

Instead of redirecting from the current page, handle OAuth initiation properly. 