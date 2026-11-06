const { createClient } = require('redis');

let pubClient = null;
let subClient = null;
let isRedisReady = false;

const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('ℹ️ REDIS_URL not configured. Socket.IO running in standalone in-memory mode.');
    return null;
  }

  try {
    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.warn('⚠️ Redis Pub Client Error:', err.message);
    });

    subClient.on('error', (err) => {
      console.warn('⚠️ Redis Sub Client Error:', err.message);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    isRedisReady = true;
    console.log('✅ Connected to Redis for Socket.IO multi-instance adapter.');
    return { pubClient, subClient };
  } catch (error) {
    console.warn('⚠️ Failed to connect to Redis. Falling back to standalone mode:', error.message);
    isRedisReady = false;
    return null;
  }
};

const getRedisClients = () => {
  return isRedisReady ? { pubClient, subClient } : null;
};

module.exports = {
  initRedis,
  getRedisClients,
};
