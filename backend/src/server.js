const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

// Load environment variables
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { registerSocketHandlers } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Socket CORS blocked origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// Start server
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn('⚠️ MongoDB connection pending: ' + dbErr.message);
      console.warn('👉 Please whitelist your IP (0.0.0.0/0) in MongoDB Atlas under Network Access.');
      console.warn('🔄 The server will stay online and automatically retry connection on incoming requests.');
    }

    // 2. Setup Redis Adapter if REDIS_URL configured
    const redisClients = await initRedis();
    if (redisClients) {
      io.adapter(createAdapter(redisClients.pubClient, redisClients.subClient));
      console.log('⚡ Socket.IO configured with Redis Adapter for horizontal scaling.');
    } else {
      console.log('⚡ Socket.IO initialized with default in-memory adapter.');
    }

    // 3. Register Socket.IO Handlers
    registerSocketHandlers(io);

    // 4. Listen
    server.listen(PORT, () => {
      console.log(`🚀 PulseChat Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 WebSocket ready at ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };
