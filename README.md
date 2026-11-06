# ChatIn — Real-Time Messaging Platform (Single-Directory Node.js)

**ChatIn** is a modern, responsive, full-stack real-time messaging application built as a clean, single-directory Node.js application using Express, EJS, Socket.IO, and MongoDB Atlas.

---

## 🌟 Key Features

- **Pure Node.js Architecture**: Everything runs in a single directory — one `package.json`, one `.env`, one command to start.
- **Sub-Second Real-Time Chat**: Bidirectional Socket.IO messaging with typing indicators ("typing..."), live delivery checkmarks (sent, delivered, read), and online/offline presence tracking.
- **1-to-1 & Group Hubs**: Private direct messages and multi-user group channels with creator admin controls.
- **Rich Media & Attachments**: Upload photos, screenshots, and documents with inline preview.
- **Adaptive Light & Dark Themes**: High-contrast dark mode and clean light mode, saved in local storage.
- **Feature-Focused Landing Page**: User-centric landing page highlighting all capabilities.
- **Secure Authentication**: Salted bcrypt password hashing and JWT stateless tokens with HTTP-only cookie support.

---

## 📁 Repository Structure

```
chatapp/
├── config/
│   └── db.js                 # Cached MongoDB Atlas connection handler
├── controllers/
│   ├── authController.js     # Register, login, logout, profile
│   ├── conversationController.js # Direct and group conversation management
│   ├── messageController.js  # Message delivery, history, attachment uploads
│   ├── notificationController.js
│   └── userController.js     # User search and profiles
├── middleware/
│   ├── authMiddleware.js     # Cookie & Bearer JWT authentication
│   ├── errorMiddleware.js    # Not found & error handlers
│   └── uploadMiddleware.js   # Multer file storage
├── models/
│   ├── Conversation.js       # Conversation schema
│   ├── Message.js            # Message schema
│   ├── Notification.js       # System notifications
│   └── User.js               # User accounts schema
├── public/
│   ├── css/
│   │   ├── chat.css          # Real-time chat layout & responsive rules
│   │   └── style.css         # Design system tokens & Light/Dark themes
│   ├── js/
│   │   ├── auth.js           # Client-side form handlers
│   │   ├── chat.js           # Socket.IO client, message pipeline & modals
│   │   └── theme.js          # Theme switcher
│   ├── uploads/              # Uploaded user avatars & media
│   ├── logo.svg              # Transparent ChatIn emblem logo
│   └── logo.png
├── routes/
│   ├── authRoutes.js         # /api/auth endpoints
│   ├── conversationRoutes.js # /api/conversations endpoints
│   ├── messageRoutes.js      # /api/messages endpoints
│   ├── pageRoutes.js         # View routes (/, /login, /register, /chat)
│   └── userRoutes.js         # /api/users endpoints
├── sockets/
│   └── socketHandler.js      # Real-time events, typing, and read receipts
├── views/
│   ├── partials/
│   │   ├── footer.ejs
│   │   ├── head.ejs
│   │   └── navbar.ejs
│   ├── 404.ejs
│   ├── chat.ejs              # Full real-time messaging UI
│   ├── landing.ejs           # Feature-focused landing page
│   ├── login.ejs             # Sign in view
│   └── register.ejs          # Registration view
├── .env.example
├── .gitignore
├── package.json              # Single unified package configuration
├── README.md
├── server.js                 # Express + Socket.IO server entry point
├── test.js                   # Automated test suite
└── vercel.json               # Vercel deployment configuration
```

---

## 🚀 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and provide your MongoDB Atlas URI:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chatin?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
```

### 3. Run Automated Tests
```bash
node test.js
```

### 4. Start the Application
```bash
npm start
```
Open your browser at **`http://localhost:5000`**.

---

## 🌐 Production Deployment

Because ChatIn is now a single-directory Node application:
- **Render / Railway / Heroku**:
  - Connect your GitHub repository.
  - Set build command: `npm install`
  - Set start command: `node server.js`
  - Add `MONGODB_URI` and `JWT_SECRET` in environment variables.
- **Vercel**:
  - Connect repository on Vercel. Root directory is `.`.
  - The included `vercel.json` automatically configures `@vercel/node` to run `server.js`.
