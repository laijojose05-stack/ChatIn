# ChatIn — Production-Grade Real-Time Messaging Application

ChatIn is a modern, responsive, full-stack real-time messaging application designed with inspiration from WhatsApp, Telegram, and Discord, featuring custom branding, real-time Socket.IO bidirectional communication, MongoDB Atlas persistence, JWT authentication, and cross-instance Redis scaling.

---

## 🌟 Key Features

### 🔐 1. Authentication & Security
- **JWT-Based Authentication**: Secure stateless token issuance and verification with auto-attach headers in Axios interceptors.
- **bcryptjs Password Hashing**: Passwords are never stored as plain text (salted and hashed with 10 rounds).
- **Protected Frontend & Backend**: Client-side route guards (`ProtectedRoute`, `PublicRoute`) and backend `protect` middleware.
- **Profile Management**: Custom avatars (uploaded via Multer), username editing, bios, and password update.
- **Security Hardening**: Helmet HTTP headers, CORS whitelisting, Express rate limiting on auth endpoints to prevent brute-force attacks.

### 💬 2. Private 1-to-1 Messaging
- **Instant Search**: Find registered users in real time with debounce.
- **Live Delivery**: Low-latency message delivery using Socket.IO.
- **Read & Delivery Receipts**: Single check (sent), double grey check (delivered), double blue check (read).
- **Typing Indicators**: Real-time debounce typing status ("... is typing").
- **Presence Tracking**: Online/offline indicators with "Last seen" timestamps.
- **History & Pagination**: Paginated chat history with "Load older messages" support.
- **Message Actions**: Quoted replies, edit messages with `(edited)` indicators, and soft-delete ("This message was deleted").
- **Attachments**: Seamless file uploads for images (PNG, JPG, WEBP, GIF) and documents (PDF, DOCX, ZIP, TXT) via Multer.
- **Built-in Emoji Picker**: Tabbed emoji selector (Smileys, Gestures, Hearts, Objects) without external bloated dependencies.

### 👥 3. Group Messaging
- **Group Creation**: Custom group name, description, group picture upload, and member selection.
- **Admin Roles**: Creator starts as group admin with permissions to add/remove members and promote/demote other admins.
- **Real-Time Group Events**: Instant member join/leave broadcasts and system notifications in conversation rooms.
- **Self-Service Leaving**: Members can leave groups, with automatic admin succession if the last admin leaves.

### 🔔 4. Notifications & Settings
- **Notification Hub**: Group invitations, new message notices, and system alerts with "Mark all as read" and deletion.
- **Themes**: Instant toggle between Light and Dark themes, persisted across sessions in `localStorage`.
- **Sound Preferences**: Audio toggle for message notifications.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Bootstrap 5, Custom CSS Variables, Lucide React icons, Axios, Socket.IO Client, React Router v7, date-fns |
| **Backend** | Node.js, Express.js, Socket.IO v4, MongoDB Atlas (Mongoose 8), Redis (`@socket.io/redis-adapter`), bcryptjs, jsonwebtoken, Multer, Helmet, express-rate-limit |
| **Database** | MongoDB Atlas (Cloud NoSQL Database with compound indexing) |
| **Real-Time State** | Redis (Optional/Recommended for horizontal multi-instance scaling via Upstash or Redis Cloud) |
| **Hosting** | Vercel (Frontend & Serverless REST API), Dedicated container/Node host for persistent WebSockets (Render, Railway, Fly.io, or VPS) |

---

## 🏗️ Architecture & Vercel Deployment Model

### Why Vercel Serverless Functions Differ From Persistent Servers
Vercel Functions are **ephemeral, stateless, and request-driven**. They spin up to serve an HTTP request and terminate/freeze shortly after sending the response (typically 10-15 seconds execution lifecycle).

- **REST API on Vercel**: The REST endpoints (`backend/api/index.js` and `backend/vercel.json`) run on Vercel Serverless Functions. Mongoose connections are cached globally across function invocations in `backend/src/config/db.js`.
- **WebSocket / Socket.IO Lifecycle**: WebSockets require long-lived, continuous bidirectional TCP connections that remain open for minutes or hours. Because Vercel Functions freeze when idle, persistent WebSockets cannot be hosted inside an ordinary serverless route without disconnecting.

### Supported Production Solutions:
1. **Frontend on Vercel + Persistent WebSocket Backend (Recommended)**:
   - Deploy `frontend/` to **Vercel** (`VITE_API_URL` and `VITE_SOCKET_URL` set to the backend).
   - Deploy `backend/` to a persistent Node host such as **Railway**, **Render**, **Fly.io**, or **Docker/VPS** running `node src/server.js`.
2. **Hybrid Deployment**:
   - Deploy `backend/` REST API to **Vercel Serverless Functions** (`api/index.js`).
   - Run the Socket.IO server on Railway/Render with `REDIS_URL` connecting both to a shared Upstash Redis instance using `@socket.io/redis-adapter`.
3. **Local Full-Stack**:
   - Both HTTP REST and WebSockets run on `http://localhost:5000` via `node src/server.js` or `npm run dev`.

---

## 📁 Repository Structure

```
chatapp/
├── backend/
│   ├── api/
│   │   └── index.js             # Vercel serverless function entrypoint
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # Cached Mongoose connection handler
│   │   │   └── redis.js         # Redis client & Socket.IO adapter configuration
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── conversationController.js
│   │   │   ├── messageController.js
│   │   │   ├── notificationController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── errorMiddleware.js
│   │   │   └── uploadMiddleware.js
│   │   ├── models/
│   │   │   ├── Conversation.js
│   │   │   ├── Message.js
│   │   │   ├── Notification.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── conversationRoutes.js
│   │   │   ├── messageRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── sockets/
│   │   │   └── socketHandler.js # Socket.IO event registrations & user presence
│   │   ├── utils/
│   │   │   └── generateToken.js
│   │   ├── app.js               # Express application configuration
│   │   └── server.js            # Persistent HTTP + Socket.IO server listener
│   ├── uploads/                 # Storage directory for avatars & message attachments
│   ├── .env.example
│   ├── package.json
│   ├── test-suite.js            # Automated unit and integration test suite
│   └── vercel.json              # Vercel backend routing configuration
├── frontend/
│   ├── public/
│   │   └── logo.svg             # ChatIn custom logo
│   ├── src/
│   │   ├── api/                 # Axios clients and REST endpoint callers
│   │   ├── components/
│   │   │   ├── chat/            # ChatArea, ChatHeader, MessageList, MessageItem, MessageInput, GroupInfoModal
│   │   │   ├── common/          # Avatar, Badge, LoadingSpinner, ToastNotification, EmojiPicker
│   │   │   └── sidebar/         # Sidebar, ConversationItem, UserSearchModal, CreateGroupModal
│   │   ├── context/             # AuthContext, SocketContext, ChatContext, ThemeContext
│   │   ├── pages/               # Login, Register, ChatDashboard, Profile, Settings, Notifications, 404
│   │   ├── App.jsx              # Routes with authentication guards
│   │   ├── index.css            # Custom Light/Dark themes and animations
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vercel.json              # Vercel SPA client routing rewrites
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v20+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or local MongoDB running at `mongodb://localhost:27017/chatin`)
- [Redis](https://upstash.com/) (optional, only needed if testing cross-instance Socket.IO clustering)

---

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd chatapp

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2: Configure Backend Environment

In `backend/`, copy `.env.example` to `.env`:

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chatin?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_random_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# Optional: Redis URL for Socket.IO multi-instance scaling (leave blank for standalone in-memory mode)
# REDIS_URL=redis://default:<password>@<host>:<port>
```

#### MongoDB Atlas Setup Guide:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g., `chatin_admin`) with password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) to permit cloud and local connections.
5. In your cluster dashboard, click **Connect** > **Drivers** (Node.js) and copy the connection string into `MONGODB_URI`.

---

### Step 3: Configure Frontend Environment

In `frontend/`, copy `.env.example` to `.env`:

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

### Step 4: Run the Application

#### Start Backend:
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
# WebSocket listener ready at ws://localhost:5000
```

#### Start Frontend:
```bash
cd frontend
npm run dev
# Vite will launch frontend on http://localhost:5173
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Testing

ChatIn includes an automated test suite verifying password hashing, JWT signing/decoding, Express middleware, and Mongoose model schema validity:

```bash
cd backend
node test-suite.js
```

Build verification for the frontend:
```bash
cd frontend
npm run build
```

---

## 🌐 Production Deployment

### 1. Frontend on Vercel
1. Push the repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/), click **Add New Project** and select your GitHub repository.
3. Set the **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: `https://your-backend-api-url.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend-socket-url.com`
8. Click **Deploy**.

### 2. Backend Deployment

#### Option A: Persistent Server on Render / Railway (Recommended for Socket.IO)
1. In [Render](https://render.com/) or [Railway](https://railway.app/), create a **New Web Service**.
2. Connect your repository and set the root directory to `backend`.
3. Build Command: `npm install`
4. Start Command: `node src/server.js`
5. Configure Environment Variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Vercel frontend URL, e.g. `https://chatin.vercel.app`)
   - `REDIS_URL` (optional: Upstash Redis connection string)
6. Copy the generated service URL (e.g., `https://chatin-api.onrender.com`) and paste it as `VITE_API_URL` and `VITE_SOCKET_URL` in your Vercel frontend.

#### Option B: REST API on Vercel Functions
- The backend contains `backend/vercel.json` and `backend/api/index.js` enabling full deployment of the REST API directly to Vercel Functions.
- To use WebSockets with serverless REST APIs, set `VITE_API_URL` to the Vercel function domain and `VITE_SOCKET_URL` to a persistent WebSocket gateway or container service.

---

## 🔌 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate with email/username & password | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user data | Private |
| `PUT` | `/api/auth/profile` | Update username and bio | Private |
| `PUT` | `/api/auth/password` | Change password | Private |
| `POST` | `/api/auth/avatar` | Upload profile image (multipart/form-data) | Private |
| `POST` | `/api/auth/logout` | Terminate session & update offline status | Private |

### Users (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users?search=...` | Search users by username or email | Private |
| `GET` | `/api/users/:id` | Get user details | Private |

### Conversations (`/api/conversations`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/conversations` | Get all user conversations with unread counts | Private |
| `POST` | `/api/conversations` | Start or resume 1-to-1 conversation | Private |
| `POST` | `/api/conversations/group` | Create group with name, description, photo, & members | Private |
| `GET` | `/api/conversations/:id` | Get conversation details | Private |
| `PUT` | `/api/conversations/:id/group` | Update group information (Admin only) | Private |
| `POST` | `/api/conversations/:id/participants` | Add members to group (Admin only) | Private |
| `DELETE` | `/api/conversations/:id/participants/:userId` | Remove member or leave group | Private |
| `PUT` | `/api/conversations/:id/admins` | Promote or demote group admin | Private |

### Messages (`/api/messages`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/messages/:conversationId` | Get messages with pagination (`limit`, `before`) | Private |
| `POST` | `/api/messages` | Send message (text, replies, attachments) | Private |
| `PUT` | `/api/messages/:id` | Edit message content | Private |
| `DELETE` | `/api/messages/:id` | Soft delete message | Private |
| `POST` | `/api/messages/:conversationId/read` | Mark all unread messages as read | Private |
| `POST` | `/api/messages/upload` | Upload file attachments (Multer) | Private |

### Notifications (`/api/notifications`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Get user notifications and unread count | Private |
| `PUT` | `/api/notifications/:id/read` | Mark single notification as read | Private |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read | Private |
| `DELETE` | `/api/notifications/:id` | Remove notification | Private |

---

## ⚡ Socket.IO Real-Time Events

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `join_conversation` | Client → Server | `conversationId` to join room `conv:<id>` |
| `leave_conversation` | Client → Server | `conversationId` to leave room |
| `send_message` | Client → Server | Emits message object to conversation room |
| `receive_message` | Server → Client | Delivers new message to conversation members |
| `new_message_notification` | Server → Client | Alerts member outside active room |
| `typing_start` | Bi-directional | `{ conversationId, username }` |
| `typing_stop` | Bi-directional | `{ conversationId, username }` |
| `message_read` | Bi-directional | Read receipts broadcast |
| `message_delivered` | Bi-directional | Delivery receipts broadcast |
| `message_edited` | Bi-directional | Live update of edited message |
| `message_deleted` | Bi-directional | Live update of deleted message |
| `user_online` / `user_offline` | Server → Client | User presence status changes |
| `active_users` | Server → Client | Initial list of currently online user IDs |

---

## ❓ Troubleshooting

1. **MongoDB Connection Fails**:
   - Ensure your IP is whitelisted on MongoDB Atlas (`0.0.0.0/0` for universal access).
   - Check that username and password in `MONGODB_URI` are URL-encoded if they contain special characters (`@`, `:`, `/`).
2. **WebSocket Connection Refused in Production**:
   - Verify that your persistent WebSocket host has started `node src/server.js`.
   - Ensure `FRONTEND_URL` in backend `.env` matches your Vercel frontend URL for CORS.
3. **CORS Blocked Requests**:
   - Verify that the frontend domain is listed in `allowedOrigins` inside `backend/src/app.js` and `backend/src/server.js`.
4. **Attachments Not Showing**:
   - If hosting locally, uploaded files are served from `/uploads`. In production multi-instance environments, consider attaching an S3/Cloudinary bucket or persistent volume for file storage.

---

## 📜 License
MIT © ChatIn Team
