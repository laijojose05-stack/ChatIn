const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatin';

  try {
    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = conn;
    const host = conn.connection?.host || conn.connections?.[0]?.host || 'MongoDB Atlas';
    console.log(`✅ MongoDB Connected successfully: ${host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // In serverless environments, do not throw fatal exception to prevent 500 FUNCTION_INVOCATION_FAILED
    return null;
  }
};

module.exports = connectDB;
