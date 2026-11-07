const mongoose = require('mongoose');

// Global connection caching for serverless environments (Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatin';

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(mongoURI, opts)
      .then((conn) => {
        const host = conn.connection?.host || conn.connections?.[0]?.host || 'MongoDB Atlas';
        console.log(`✅ MongoDB Connected successfully: ${host}`);
        return conn;
      })
      .catch((error) => {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        cached.promise = null;
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    return null;
  }

  return cached.conn;
};

module.exports = connectDB;
