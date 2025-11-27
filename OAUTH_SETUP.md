# OAuth2 Setup Guide

This application now supports OAuth2 authentication with Google, Facebook, and GitHub.

## Features

- ✅ **Email Uniqueness**: Each email can only be registered once
- ✅ **Provider Lock**: Users cannot mix auth methods (e.g., cannot signup with Google then login with email/password)
- ✅ **Clear Error Messages**: System shows helpful error messages when email conflicts occur

## Setup Instructions

### 1. Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Set Authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Copy Client ID and Client Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### 2. Facebook OAuth2

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add "Facebook Login" product
4. Go to Settings → Basic
5. Set Valid OAuth Redirect URIs:
   - `http://localhost:3001/api/auth/facebook/callback` (development)
   - `https://yourdomain.com/api/auth/facebook/callback` (production)
6. Copy App ID and App Secret to `.env`:
   ```
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

### 3. GitHub OAuth2

1. Go to [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: Your App Name
   - Homepage URL: `http://localhost:3000` (or your domain)
   - Authorization callback URL: `http://localhost:3001/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

### 4. Update Environment Variables

Edit `services/.env`:

```env
# Server URL (important for OAuth callbacks)
SERVER_URL=http://localhost:3001

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth2
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# GitHub OAuth2
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 5. Update Client Environment (Optional)

If your server is not at `http://localhost:3001`, create `client/.env`:

```env
VITE_SERVER_URL=http://localhost:3001
```

## How It Works

### Email Conflict Prevention

**Scenario 1**: User signs up with Google (email: `user@gmail.com`)
- ✅ Account created with `authProvider: "google"`
- ❌ Cannot signup/login with email/password using `user@gmail.com`
- Error: "This email is already registered with google. Please use google to sign in."

**Scenario 2**: User signs up with email/password (email: `user@example.com`)
- ✅ Account created with `authProvider: "local"`
- ❌ Cannot signup/login with Google/Facebook/GitHub using same email
- Error: "This email is already registered with local. Please use local to sign in."

### User Flow

1. **New User**:
   - Choose authentication method (Email/Password, Google, Facebook, or GitHub)
   - Create account
   - Complete profile (if needed)
   - Access chat

2. **Returning User**:
   - Must use the same authentication method they signed up with
   - Cannot switch between methods without creating a new account with different email

## Testing

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client:
   ```bash
   cd client
   npm run dev
   ```

3. Try signing up with:
   - Email/Password
   - Google
   - Facebook
   - GitHub

4. Verify error messages appear when trying to:
   - Signup with already registered email
   - Login with wrong auth method

## Database Schema Changes

### User Model Updates

New fields added:
- `authProvider`: "local" | "google" | "facebook" | "github"
- `googleId`: Unique Google user ID
- `facebookId`: Unique Facebook user ID
- `githubId`: Unique GitHub user ID
- `password`: Now optional (not required for OAuth users)

## Security Notes

- ✅ Passwords are still hashed with bcrypt + salt + pepper for local auth
- ✅ OAuth tokens are not stored (session-based auth)
- ✅ JWT tokens used for authenticated requests
- ✅ Email uniqueness enforced at database level
- ⚠️ Make sure to use HTTPS in production
- ⚠️ Keep your OAuth secrets secure (never commit to git)
- ⚠️ Update callback URLs for production deployment

## Troubleshooting

### "Email is already registered" error
- Check which auth provider was used initially
- Use the same provider to login

### OAuth callback fails
- Verify callback URLs match in OAuth provider settings
- Check SERVER_URL in `.env` is correct
- Ensure port 3001 is not blocked

### Session issues
- Clear browser cookies
- Check SESSION_SECRET is set in `.env`
- Verify express-session middleware is initialized

## Production Deployment

Before deploying:

1. Update `SERVER_URL` in `.env` to your production URL
2. Update OAuth callback URLs in provider consoles
3. Use HTTPS for all OAuth flows
4. Set secure cookie options:
   ```javascript
   cookie: {
     secure: true,
     sameSite: 'strict'
   }
   ```

