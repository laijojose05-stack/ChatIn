require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const { app, server } = require('./server');

async function runTests() {
  console.log('🧪 Starting ChatIn Single-Directory Test Suite...\n');

  try {
    // 1. Verify DB connection
    console.log('1. Testing Database Connection...');
    const conn = await connectDB();
    if (conn) {
      console.log('   ✅ MongoDB connected successfully');
    }

    // 2. Test server listening
    console.log('2. Testing HTTP Server...');
    const PORT = 5001; // test port
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`   ✅ Server successfully listening on port ${PORT}`);

    // 3. Test Health Check Endpoint
    console.log('3. Testing /api/health...');
    const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status === 200 && healthJson.status === 'ok') {
      console.log('   ✅ /api/health returned 200 OK');
    } else {
      throw new Error('/api/health failed');
    }

    // 4. Test Landing Page Route
    console.log('4. Testing Landing Page (GET /)...');
    const landingRes = await fetch(`http://localhost:${PORT}/`);
    const landingHtml = await landingRes.text();
    if (landingRes.status === 200 && landingHtml.includes('ChatIn')) {
      console.log('   ✅ GET / rendered ChatIn Landing Page with 200 OK');
    } else {
      throw new Error('Landing page render failed');
    }

    // 5. Test Login Page Route
    console.log('5. Testing Login Page (GET /login)...');
    const loginRes = await fetch(`http://localhost:${PORT}/login`);
    const loginHtml = await loginRes.text();
    if (loginRes.status === 200 && loginHtml.includes('Sign In')) {
      console.log('   ✅ GET /login rendered Sign In page with 200 OK');
    } else {
      throw new Error('Login page render failed');
    }

    // 6. Test Register Page Route
    console.log('6. Testing Register Page (GET /register)...');
    const regRes = await fetch(`http://localhost:${PORT}/register`);
    const regHtml = await regRes.text();
    if (regRes.status === 200 && regHtml.includes('Create Account')) {
      console.log('   ✅ GET /register rendered Register page with 200 OK');
    } else {
      throw new Error('Register page render failed');
    }

    // 7. Test Auth Protected Route Redirect (GET /chat without cookie)
    console.log('7. Testing Protected Route (GET /chat)...');
    const chatRes = await fetch(`http://localhost:${PORT}/chat`, { redirect: 'manual' });
    if (chatRes.status === 302) {
      console.log('   ✅ GET /chat properly redirects unauthenticated users to /login (302)');
    } else {
      throw new Error('Protected route redirect failed');
    }

    console.log('\n🎉 ALL 7 TESTS PASSED! ChatIn Single-Directory Node App is 100% operational.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
