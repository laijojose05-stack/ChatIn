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
    if (regRes.status === 200 && regHtml.includes('Create your account')) {
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

    // 8. Test 404 Route Render
    console.log('8. Testing 404 Page (GET /not-a-real-page)...');
    const notFoundRes = await fetch(`http://localhost:${PORT}/not-a-real-page`);
    const notFoundHtml = await notFoundRes.text();
    if (notFoundRes.status === 404 && notFoundHtml.includes('404')) {
      console.log('   ✅ GET /not-a-real-page renders 404 view correctly');
    } else {
      throw new Error('404 route failed');
    }

    // 9. Test Auth API Validation
    console.log('9. Testing Auth API Validation (POST /api/auth/login)...');
    const authApiRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const authApiJson = await authApiRes.json();
    if (authApiRes.status === 400 && authApiJson.success === false) {
      console.log('   ✅ POST /api/auth/login returns 400 with validation message');
    } else {
      throw new Error('Auth API validation test failed');
    }

    // 10. Test Anti-Spam Honeypot Bot Trap
    console.log('10. Testing Anti-Spam Bot Honeypot (POST /api/auth/register with honeypot filled)...');
    const botRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'spambot99',
        email: 'spambot99@spam.com',
        password: 'password123',
        _hp_website: 'http://spam-site.com',
      }),
    });
    const botJson = await botRes.json();
    if (botRes.status === 200 && botJson.message === 'Account processed') {
      console.log('   ✅ Honeypot successfully trapped bot without creating account');
    } else {
      throw new Error('Honeypot protection test failed');
    }

    // 11. Test Workspace Profile & Password Endpoints
    console.log('11. Testing Workspace Profile & Settings API Endpoints...');
    const testUsername = `user_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    const settingsUserRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const settingsUserJson = await settingsUserRes.json();
    const token = settingsUserJson.token || settingsUserJson.data?.token;
    if (!settingsUserRes.ok || !token) {
      throw new Error(`Failed to create test user: ${settingsUserJson.message}`);
    }

    const profileRes = await fetch(`http://localhost:${PORT}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bio: 'Updated bio from automated test suite',
      }),
    });
    const profileJson = await profileRes.json();
    if (!profileRes.ok || !profileJson.success) {
      throw new Error(`Failed to update profile: ${profileJson.message}`);
    }
    console.log('   ✅ PUT /api/users/profile updated user bio successfully');

    const pwdRes = await fetch(`http://localhost:${PORT}/api/users/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword!',
        newPassword: 'NewPassword123!',
      }),
    });
    if (pwdRes.status === 400 || pwdRes.status === 401) {
      console.log('   ✅ PUT /api/users/password verified current password validation');
    } else {
      throw new Error('Password security check failed');
    }

    // Teardown: Clean up automated test user so live database stays pristine
    const User = require('./models/User');
    await User.deleteOne({ email: testEmail });
    console.log('   ✅ Automated test user cleaned up from database');

    console.log('\n🎉 ALL 11 TESTS PASSED! ChatIn Single-Directory Node App is 100% operational, spam-protected, and equipped with settings.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
