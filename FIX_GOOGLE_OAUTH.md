# 🔴 URGENT: Fix Google & GitHub OAuth - Step-by-Step

## ✅ Your Server is READY! 

The callback URLs are configured correctly:
- **Google**: `http://localhost:3001/api/auth/google/callback`
- **GitHub**: `http://localhost:3001/api/auth/github/callback`

Server logs confirm:
```
🔧 Registering Google OAuth strategy...
📍 Google callback URL: http://localhost:3001/api/auth/google/callback
🔧 Registering GitHub OAuth strategy...
📍 GitHub callback URL: http://localhost:3001/api/auth/github/callback
```

## 🚨 What You MUST Do NOW:

---

## Part 1: Fix Google OAuth

### Step 1: Open Google Cloud Console

Go to: **https://console.cloud.google.com/**

### Step 2: Navigate to Credentials

1. Click on your project (or select it from dropdown)
2. In the left sidebar, click **"APIs & Services"**
3. Click **"Credentials"**

### Step 3: Edit OAuth 2.0 Client ID

1. Find your OAuth 2.0 Client ID:
   ```
   402686198461-iajt4cap1eosqs6g7m63ceq6lvo8b4ni.apps.googleusercontent.com
   ```
2. Click on it to edit

### Step 4: Add Authorized Redirect URI

In the **"Authorized redirect URIs"** section:

1. Click **"+ ADD URI"**
2. Paste EXACTLY this (copy-paste to avoid typos):
   ```
   http://localhost:3001/api/auth/google/callback
   ```
3. Click **"SAVE"**

### Step 5: Wait 5-10 Seconds

Google needs a few seconds to propagate the changes.

---

## Part 2: Fix GitHub OAuth

### Step 1: Open GitHub Developer Settings

Go to: **https://github.com/settings/developers**

### Step 2: Select Your OAuth App

1. Click **"OAuth Apps"** in the left sidebar
2. Find your app with Client ID:
   ```
   Ov23liFD9p2JBMsLFINf
   ```
3. Click on it

### Step 3: Update Authorization Callback URL

1. In the **"Authorization callback URL"** field, paste:
   ```
   http://localhost:3001/api/auth/github/callback
   ```
2. Click **"Update application"**

---

## Step 6: Test!

### Test Google:
1. Go to `http://localhost:3000/auth`
2. Click **"Continue with Google"**
3. Watch server console for detailed logs

### Test GitHub:
1. Go to `http://localhost:3000/auth`
2. Click **"Continue with GitHub"**
3. Watch server console for detailed logs

---

## 🐛 Common Mistakes to AVOID:

| ❌ WRONG | ✅ CORRECT |
|---------|----------|
| `http://localhost:3000/api/auth/google/callback` | `http://localhost:3001/api/auth/google/callback` |
| `http://localhost:3001/auth/google/callback` | `http://localhost:3001/api/auth/google/callback` |
| `http://localhost:3001/api/auth/google/callback/` (trailing slash) | `http://localhost:3001/api/auth/google/callback` |
| `https://localhost:3001/api/auth/google/callback` (https) | `http://localhost:3001/api/auth/google/callback` (http) |

---

## 📊 What to Expect After Fix:

### ✅ Success Logs:
```
🚀 Starting Google OAuth flow...
📍 Callback URL will be: http://localhost:3001/api/auth/google/callback
📥 Google OAuth callback hit!
📋 Query params: { code: '...' }
🔍 Google OAuth profile received: { id: '...', email: 'user@gmail.com', name: '...' }
✅ Google OAuth successful: user@gmail.com
```

Browser redirects to: `http://localhost:3000/chat` ✅

### ❌ Still Failing?

Server logs will show the exact error:
```
❌ Google OAuth error: ...
Error details: { message: '...', stack: '...' }
```

Copy the error and we can debug further!

---

## 🎯 Quick Checklist:

- [ ] Google Cloud Console: Added `http://localhost:3001/api/auth/google/callback`
- [ ] Clicked SAVE in Google Console
- [ ] GitHub OAuth App: Set `http://localhost:3001/api/auth/google/callback`
- [ ] Clicked "Update application" in GitHub
- [ ] Server is running (check `http://localhost:3001`)
- [ ] Client is running (check `http://localhost:3000`)
- [ ] Tested Google OAuth
- [ ] Tested GitHub OAuth

---

Make sure port is **3001** (the Express server), NOT **3000** (the React client)! 🎯

