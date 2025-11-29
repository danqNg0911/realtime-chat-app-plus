# OAuth2 Setup Guide

This application now supports OAuth2 authentication with Google, Facebook, and GitHub.

## Features

- ✅ **Email Uniqueness**: Each email can only be registered once
- ✅ **Provider Lock**: Users cannot mix auth methods (e.g., cannot signup with Google then login with email/password)
- ✅ **Clear Error Messages**: System shows helpful error messages when email conflicts occur

## Setup Instructions

### Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Set Authorized redirect URIs:
   - `http://34.142.152.144/api/auth/google/callback` (cloud static IP)
   - `http://localhost:3001/api/auth/google/callback` (local development)
7. Copy Client ID and Client Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

###  GitHub OAuth2

1. Go to [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: Your App Name
   - Homepage URL: `http://localhost:3000` (or your domain)
   - Authorization callback URL: `http://<your-domain>/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```

### 4. Update Environment Variables

For cloud deployment, update `cloud/k8s/base/secret.yaml` and `cloud/k8s/base/configmap.yaml`:

```env
# Server URL (important for OAuth callbacks)
SERVER_URL=http://34.142.152.144

# Session Secret (generate a random string)
SESSION_SECRET=your-random-session-secret

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://34.142.152.144/api/auth/google/callback

# Facebook OAuth2
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://34.142.152.144/api/auth/facebook/callback

# GitHub OAuth2
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://34.142.152.144/api/auth/github/callback
```

### 5. Update Client Environment (Optional)

For cloud deployment, set in `cloud/k8s/base/configmap.yaml`:

```env
VITE_SERVER_URL=http://34.142.152.144
```

## Cloud Deployment Steps

1. Reserve static IPs for API Gateway and Client:
   ```cmd
   gcloud compute addresses create chat-gateway-ip --region=asia-southeast1
   gcloud compute addresses create chat-client-ip --region=asia-southeast1
   gcloud compute addresses list
   ```
2. Update all callback URLs and envs in `cloud/k8s/base/secret.yaml` and `cloud/k8s/base/configmap.yaml` to use the static IPs (e.g., `http://34.142.152.144`).
3. Build and push Docker images to Artifact Registry:
   ```cmd
   docker build -t <AR>/api-gateway:latest services/api-gateway
   docker push <AR>/api-gateway:latest
   ...
   docker build -t <AR>/client:latest ./client
   docker push <AR>/client:latest
   ```
4. Connect to GKE cluster:
   ```cmd
   gcloud container clusters get-credentials realtime-chat-autopilot-1 --region=asia-southeast1 --project=app-chat-478713
   ```
5. Apply kustomize overlay:
   ```cmd
   kubectl apply -k cloud/k8s/overlays/gke
   ```
6. Restart deployments:
   ```cmd
   kubectl rollout restart deploy/api-gateway
   kubectl rollout restart deploy/client
   ...
   ```
7. Check pod status:
   ```cmd
   kubectl get pods -A
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

