require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { registerSocketHandlers } = require('./sockets/socketHandler');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/securityMiddleware');

// Route imports
const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Ensure DB is connected for serverless invocations (Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {}

  // Guard API endpoints from hanging when database is not connected
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please check that MONGODB_URI is set in Vercel and 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.',
      });
    }
  }

  next();
});

// View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Page Routes (Views)
app.use('/', pageRoutes);

// Apply API Rate Limiting to all /api endpoints
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'ChatIn Unified Node App',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  pingTimeout: 60000,
  transports: ['websocket', 'polling'],
});

// Attach Socket.IO to Express app for controllers if needed
app.set('io', io);

// Register Socket handlers
registerSocketHandlers(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start Server if run directly
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 ChatIn Node Server running at http://localhost:${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Real-time Socket.IO: Ready\n`);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.PORT = PORT;
