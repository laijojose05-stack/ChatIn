# ChatIn — Real-Time Messaging & Workspace Platform

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-8.10-forestgreen.svg)](https://www.mongodb.com/atlas)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-purple.svg)](https://getbootstrap.com/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-brightgreen.svg)](test.js)

**ChatIn** is a full-featured, real-time messaging application and team workspace built as a clean, single-directory Node.js application using Express, EJS, Socket.IO, WebRTC, and MongoDB Atlas. It features bidirectional sub-second messaging, peer-to-peer HD video & voice calling, multi-channel group hubs, anti-spam security, a Linear-inspired landing page, and a master-detail settings suite.

---

## 🌟 Key Features

### 1. Peer-to-Peer Real-Time Audio & Video Calling (WebRTC)
- **HD Video & Voice Calls**: Direct browser-to-browser P2P calls powered by WebRTC with public Google STUN fallbacks.
- **Synthesized Ringtones & Dial Tones**: Native browser ringtones and dialing sounds synthesized with the Web Audio API without needing external media files.
- **Active Call Floating Window**: Fullscreen or floating overlay with call duration timer, live connection indicator, and quality metrics.
- **Picture-in-Picture (PiP)**: Draggable / pinned local video preview with instant camera toggle and audio muting.
- **Screen Sharing**: One-click screen sharing support alongside active calls.
- **Background Multitasking Pill**: Minimize active calls to a floating dock pill to continue reading or typing chat messages simultaneously.

### 2. Real-Time Bidirectional Messaging
- **Sub-50ms Message Delivery**: Bidirectional WebSockets via Socket.IO with automatic HTTP long-polling fallback.
- **Delivery & Read Receipts**: Visual status checkmarks (`sent` ✓, `delivered` ✓✓, `read` ✓✓ in accent purple).
- **Typing Indicators**: Real-time debounce broadcasting ("typing...") across direct messages and group channels.
- **Online Presence**: Live status dots and heartbeat tracking reflecting user connection state.
- **Audio Chimes**: Instant 2-tone notification bell synthesized directly in the browser via Web Audio API (no external asset downloads).

### 2. Multi-Channel Group & Direct Messaging
- **1-to-1 Direct Messages**: Instant private conversations with verified user handles.
- **Dynamic Group Hubs**: Multi-participant group channels with admin governance, participant counts, and channel descriptions.
- **Rich Media & Attachments**: Upload photos, documents, and screenshots with inline previews and secure storage.

### 3. Professional Master-Detail Workspace Settings
- **👤 My Profile**:
  - Gradient mesh cover banner with overlapping circular profile avatar.
  - Photo upload with non-destructive instant preview.
  - Custom username handle, verified email badge, and status bio with a live `150` character counter.
- **🔒 Security & Access**:
  - 256-bit stateless JWT session health badge and bcrypt salt verification.
  - Secure password update form with show/hide password toggles.
  - Active session monitor tracking current browser, OS, and IP connection.
- **🎨 Appearance & Themes**:
  - Visual theme selector cards for **Obsidian Slate (Dark)** and **Crisp Light** modes.
  - Custom workspace accent color picker: **Indigo (Default)**, **Violet**, **Emerald**, **Sky Cyan**, and **Rose**.
  - Comfortable vs. Compact chat bubble density toggle.
- **🔔 Sounds & Alerts**:
  - Master audio chime toggle with an interactive **"▶ Test Chime"** preview button.
  - Browser desktop push notification permission trigger.
- **⌨️ Chat & Shortcuts**:
  - **Press Enter to Send**: Toggle between sending on <kbd>Enter</kbd> (with <kbd>Shift + Enter</kbd> for newlines) vs. multiline.
  - Global keyboard shortcuts: <kbd>Ctrl + ,</kbd> (Settings), <kbd>Ctrl + K</kbd> (Search), <kbd>Esc</kbd> (Close modals).
- **⚡ System Telemetry**:
  - Live round-trip HTTP server latency tester against `/api/health`.
  - Real-time Socket.IO connection status dot and transport indicator (`websocket`).
  - One-click local cache reset.

### 4. Anti-Spam & Defense-in-Depth Security
- **Invisible Honeypot Traps**: Silent trapping of automated bots without writing junk records to MongoDB.
- **Submission Speed Traps**: Flags and blocks superhuman form submission speeds (`< 600ms`).
- **Tiered Express Rate Limiters**:
  - Global API limiter: `150 requests / 15 minutes`
  - Registration limiter: `6 accounts / hour / IP`
  - Login limiter: `12 attempts / 15 minutes / IP`
  - Message limiter: `45 messages / minute`
- **Socket Flood Protection**: Caps individual socket connections at 25 messages per 10-second window.
- **Sanitization & Headers**: XSS payload stripping and HTTP security headers via Helmet.

### 5. High-Contrast Unified Auth Pages
- **WCAG AAA Compliance**: High-contrast typography in both dark and light modes, eliminating dark-on-dark contrast issues.
- **Zero-FOUC Theme Script**: Inline pre-paint theme evaluator in `<head>` ensuring immediate theme styling without screen flash.
- **Live Avatar Initials Badge**: Dynamic `CI` badge that updates in real time as the user types their username.
- **Live Password Strength Meter**: Multi-step strength progress bar with live requirement checkmarks.

### 6. SaaS-Tier Interactive Landing Page
- **Live Server Telemetry Badge**: Real-time ping latency benchmark polling `/api/health`.
- **Interactive Workspace Sandbox**: Functional product preview with channel switching and live messaging simulation.
- **Architecture Bento Grid**: Showcasing Socket.IO bidirectional pipeline, MongoDB Atlas clusters, and stateless JWT sessions.
- **FAQ Accordion & CTA**: Interactive frequently asked questions and high-conversion onboarding anchors.

---

## 📁 Repository Structure

```
chatapp/
├── config/
│   └── db.js                     # Cached MongoDB Atlas connection handler
├── controllers/
│   ├── authController.js         # Register, login, logout, active user
│   ├── conversationController.js # Direct & group conversation management
│   ├── messageController.js      # Message dispatch, Socket.IO broadcast, attachments
│   └── userController.js         # User search, profile update, password change
├── middleware/
│   ├── authMiddleware.js         # Cookie & Bearer JWT authentication guards
│   ├── errorMiddleware.js        # Global error and 404 handler
│   ├── securityMiddleware.js     # Rate limiters, honeypots, and sanitization
│   └── uploadMiddleware.js       # Multer multipart file upload engine
├── models/
│   ├── Conversation.js           # Conversation schema (direct & group channels)
│   ├── Message.js                # Message schema with status and attachments
│   └── User.js                   # User accounts schema with bcrypt methods
├── public/
│   ├── css/
│   │   ├── chat.css              # Workspace layout, master-detail settings, emojis
│   │   ├── landing.css           # SaaS landing page, hero, bento grid, telemetry
│   │   └── style.css             # Design tokens, high-contrast themes, auth cards
│   ├── js/
│   │   ├── auth.js               # Client validation, live avatar badge, strength meter
│   │   ├── chat.js               # Socket.IO client, settings handlers, audio chimes
│   │   ├── landing.js            # Live ping benchmark and interactive mockup
│   │   └── theme.js              # Theme switcher & persistence
│   ├── uploads/                  # Uploaded user avatars & media
│   └── logo.svg / logo.png       # ChatIn brand emblem and logo assets
├── routes/
│   ├── authRoutes.js             # /api/auth endpoints (rate-limited)
│   ├── conversationRoutes.js     # /api/conversations endpoints
│   ├── messageRoutes.js          # /api/messages endpoints
│   ├── pageRoutes.js             # View routes (/, /login, /register, /chat)
│   └── userRoutes.js             # /api/users endpoints (/search, /profile, /password)
├── sockets/
│   └── socketHandler.js          # Real-time WebSocket events, typing, and read receipts
├── views/
│   ├── partials/
│   │   ├── footer.ejs
│   │   ├── head.ejs              # Includes zero-FOUC theme initializer
│   │   └── navbar.ejs
│   ├── 404.ejs                   # Not found error view
│   ├── chat.ejs                  # Real-time workspace & master-detail settings
│   ├── error.ejs                 # Server error view
│   ├── landing.ejs               # Interactive SaaS landing page
│   ├── login.ejs                 # Centered high-contrast login card
│   └── register.ejs              # Centered registration card with live avatar preview
├── .env.example
├── .gitignore
├── package.json                  # Unified single-directory package config
├── README.md
├── server.js                     # Express + Socket.IO server entry point
├── test.js                       # 11-step automated verification suite
└── vercel.json                   # Serverless deployment configuration
```

---

## 🛠️ API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create account (honeypot protected) | Public | 6 / hour |
| `POST` | `/api/auth/login` | Sign in with email or username | Public | 12 / 15 min |
| `GET` | `/api/auth/logout` | Clear auth token cookie | Private | Global |
| `GET` | `/api/auth/me` | Fetch active authenticated user | Private | Global |

### Users & Settings (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/search?q=` | Search users by username or email | Private |
| `PUT` | `/api/users/profile` | Update username, bio, and avatar photo | Private |
| `PUT` | `/api/users/password` | Verify current password and update to new | Private |
| `GET` | `/api/users/:id` | Get public profile details | Private |

### Conversations (`/api/conversations`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/conversations` | List user's direct and group conversations | Private |
| `POST` | `/api/conversations` | Create direct chat or multi-user group | Private |
| `GET` | `/api/conversations/:id` | Fetch specific conversation details | Private |

### Messages (`/api/messages`)
| Method | Endpoint | Description | Access | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/messages/:id` | Get paginated message history | Private | Global |
| `POST` | `/api/messages` | Send message (broadcasts via Socket.IO) | Private | 45 / min |
| `POST` | `/api/messages/:id/read` | Mark all conversation messages as read | Private | Global |
| `POST` | `/api/messages/upload` | Upload photos and document attachments | Private | Global |

### Telemetry (`/api/health`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System health, database connection, and latency | Public |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: A free MongoDB Atlas cluster connection string

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/laijojose05-stack/ChatIn.git
cd ChatIn
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chatin?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
```

### 4. Run Automated Verification Tests
Run the 11-step automated test suite to verify MongoDB, Express, API routes, honeypots, and settings:
```bash
node test.js
```
Expected output:
```
🧪 Starting ChatIn Single-Directory Test Suite...
1. Database Connection       -> ✅ MongoDB Atlas Connected
2. HTTP Server Health        -> ✅ Server listening on port 5001
3. Health API Endpoint       -> ✅ 200 OK
4. Landing Page              -> ✅ 200 OK
5. Sign In Page              -> ✅ 200 OK
6. Register Page             -> ✅ 200 OK
7. Protected Chat Route      -> ✅ 302 Redirect
8. 404 Handler               -> ✅ 404 Handled
9. Auth API Validation       -> ✅ 400 Validation
10. Anti-Spam Honeypot       -> ✅ Bot trapped silently
11. Profile & Password API   -> ✅ Bio & Password validation tested
🎉 ALL 11 TESTS PASSED!
```

### 5. Launch the Server
```bash
npm start
```
Visit **`http://localhost:5000`** in your browser.

---

## 🌐 Production Deployment

ChatIn is configured for one-click deployment on standard cloud hosts:

- **Railway / Render / Heroku**:
  - Connect your GitHub repository.
  - Build command: `npm install`
  - Start command: `node server.js`
  - Supply `MONGODB_URI` and `JWT_SECRET` in environment variables.
- **Vercel**:
  - Connect the repository with root directory `.`.
  - The bundled `vercel.json` deploys `server.js` using `@vercel/node`.

---

## 📄 License

This project is licensed under the MIT License.
