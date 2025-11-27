## Realtime Chat App

A real-time chat application whose style is heavily inspired by WhatsApp. Built using the MERN Stack (`MongoDB`, `Express.js`, `React`, `Node.js`) with `Cloudinary` for file storage and `Socket.IO` for instant messaging.

> [!WARNING]
> Messages sent in direct messages and group chats are **_not encrypted_** and are stored as **_plain text_** in the database. **DO NOT share** sensitive information, such as passwords, financial details, or any private data that you use in other applications or accounts. Use this chat app only for the purpose of previewing a demo application.

### 🚩 Live Demo

Current version running at: [https://realtime-chat-app-one-topaz.vercel.app](https://realtime-chat-app-one-topaz.vercel.app)

> [!NOTE]
> It may take up to 1 minute for the site to be brought up while the loading indicator is displayed, since free instances in Render will spin down with inactivity which can delay requests by 50 seconds or more.

### ✨ Features

- signing up & signing in
- setting up your profile info when signing in for the first time
- updating your profile info
- adding new friends to chat with by sending them friend requests
- approving or rejecting the received friend requests
- creating group messages
- real-time chatting with your friends in direct messages and groups
- sending images and other files in chats
- filtering your chats for displaying `all chats`, `DMs` or `groups`
- searching for a specific chat in direct messages and groups or a request in friend requests
- viewing the `contact information`, `groups in common` and `files shared between you` in your friends' profile
- viewing the `creation date`, `members` and `files shared` of the groups you are in

### 🧱 Service Architecture

- `services/api-gateway`: single entry point that terminates CORS/helmet/morgan and proxies REST + Socket.IO traffic to downstream services.
- `services/auth-user-service`: handles authentication, OAuth callbacks, sessions, contacts, friend-requests, and block management.
- `services/chat-service`: owns messages, groups, LiveKit call helpers, and the Socket.IO server; receives internal photo events to fan out over websockets.
- `services/media-ai-service`: stores photo feed uploads, runs scheduled cleanup, and now exposes the AI assistant HTTP endpoints.
- `client`: Vite React app that talks to the gateway via `VITE_SERVER_URL`.

### ⚙ Setup

- Create a shared `.env` file inside the `services` folder (each service reads it directly).

```
# Gateway & service ports
GATEWAY_PORT=3001
AUTH_SERVICE_PORT=4001
CHAT_SERVICE_PORT=4002
MEDIA_SERVICE_PORT=4003

# Service URLs consumed by the gateway & internal callbacks
SERVER_URL=http://localhost:3001
AUTH_SERVICE_URL=http://localhost:4001
CHAT_SERVICE_URL=http://localhost:4002
MEDIA_SERVICE_URL=http://localhost:4003
CHAT_INTERNAL_EVENTS_URL=http://localhost:4002/internal/events
INTERNAL_API_TOKEN=dev-internal-token

# JWT & Security
JWT_KEY="your-jwt-secret-key"
PEPPER_STRING="your-pepper-string"
SESSION_SECRET="your-session-secret-key"

# Frontend Origin (comma-separated list supported for gateways/CDN edges)
ORIGIN="http://localhost:3000,http://127.0.0.1:3000"

# Database
DATABASE_URL="mongodb://localhost:27017/chatapp"


# AI Assistant (Get from: https://aistudio.google.com/api-keys) 
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.0-flash"
AI_ASSISTANT_EMAIL="hieu.ai@system"
AI_ASSISTANT_FIRST_NAME="Hieu"
AI_ASSISTANT_LAST_NAME="AI"
AI_ASSISTANT_SYSTEM_PROMPT="You are an upbeat Vietnamese-speaking AI copilot built into a realtime chat app. Provide concise, helpful replies, avoid mentioning system internals, and keep a friendly tone."
AI_ASSISTANT_IMAGE="https://example.com/ai-assistant-image.png"
AI_ASSISTANT_HISTORY_LIMIT=50
AI_ASSISTANT_TEMPERATURE=0.7
AI_ASSISTANT_MAX_TOKENS=400

# Tutorial file: OAUTH_SETUP.md (file hướng dẫn set up link dưới)
# Google OAuth2
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# Facebook OAuth2
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"
FACEBOOK_CALLBACK_URL="http://localhost:3001/api/auth/facebook/callback"

# GitHub OAuth2
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3001/api/auth/github/callback"

```

> Keep `INTERNAL_API_TOKEN` identical for the chat and media services; the media service signs webhook-style callbacks with it and the chat service validates before emitting socket events.

- Create a `.env` file in the `client` folder

```
VITE_SERVER_URL="http://localhost:3001"
# Optional when your REST base is served behind /api on a gateway.
# If omitted the client automatically derives the socket origin from VITE_SERVER_URL.
VITE_SOCKET_URL="http://localhost:3001"
VITE_SOCKET_PATH="/socket.io"
VITE_CLOUDINARY_CLOUD_NAME="YOUR_CLOUD_NAME"
VITE_CLOUDINARY_UPLOAD_PRESET="YOUR_UNSIGNED_UPLOAD_PRESET"
VITE_CLOUDINARY_FOLDER="uploads"
```

> If you deploy behind an API gateway that exposes REST under `/api` but proxies Socket.IO from the root, set `VITE_SERVER_URL=https://gateway.example.com/api` and `VITE_SOCKET_URL=https://gateway.example.com`. This prevents `GET /api/socket.io` 404s during the WebSocket handshake while keeping REST calls scoped to `/api`.

### 🏃‍♂️ Running in local development mode

- `services/auth-user-service`

```bash
cd services/auth-user-service
npm install
npm run dev
```

- `services/chat-service`

```bash
cd services/chat-service
npm install
npm run dev
```

- `services/media-ai-service`

```bash
cd services/media-ai-service
npm install
npm run dev
```

- `services/api-gateway`

```bash
cd services/api-gateway
npm install
npm run dev
```

- `client`

```bash
cd client
npm install
npm run dev
```

- **Windows shortcut**

```bat
run-all-services.bat
```

Runs every backend plus the client in separate Command Prompt windows (make sure each folder has already run `npm install`).

- Open http://localhost:3000 with your browser to see the result (ensure the four backend services above keep running in separate terminals).

### 📷 Screenshots

`SIGNING UP & SIGNING IN:`
![signup](https://github.com/user-attachments/assets/9f656b5b-bdd6-42be-9293-e44f52ca0359)
![signin](https://github.com/user-attachments/assets/7f9e478c-c802-437d-acae-10794bf12392)

`SETTING UP YOUR PROFILE:`
![profile-landing](https://github.com/user-attachments/assets/25656c2d-9dcf-4f11-a242-b8e90745a84f)

`SENDING & VIEWING FRIEND REQUESTS:`
![send-friend-request](https://github.com/user-attachments/assets/3e5d6bd1-5110-4452-8c73-4d159661719d)
![friend-requests](https://github.com/user-attachments/assets/a81c0290-ff62-4f01-9792-de9be3ff30af)

`DIRECT MESSAGING:`
![start-new-chat](https://github.com/user-attachments/assets/95dada0c-b57f-438f-87ec-b7c219b18880)
![chats](https://github.com/user-attachments/assets/5ca65d19-c537-419e-984d-533a7d939aaf)

`GROUP MESSAGING:`
![create-group](https://github.com/user-attachments/assets/cae7f705-9665-4c32-973b-c3fd89d75c60)
![group-chat](https://github.com/user-attachments/assets/8c070f09-e482-47de-8b48-d059f453b6b6)

`SEARCH FUNCTIONALITY:`
![search-chats](https://github.com/user-attachments/assets/a01e754f-8a12-4b95-abcb-d4060a8a9a0d)

`UPDATING YOUR PROFILE:`
![profile-update](https://github.com/user-attachments/assets/858fc66f-5e2d-4ae6-b2a8-ea5b00315501)

`VIEWING FRIEND & GROUP PROFILE:`
![friend-info](https://github.com/user-attachments/assets/c577cda1-1f15-4c74-a367-73661c56a5bc)
![group-info](https://github.com/user-attachments/assets/bcb770e9-aea9-4b42-bcfd-02ae935d19fd)
