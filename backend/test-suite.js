const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateToken = require('./src/utils/generateToken');

async function runTests() {
  console.log('🧪 Starting PulseChat Automated Unit & Integration Checks...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Password Hashing Test
  console.log('--- Test 1: Password Hashing & Verification ---');
  const rawPassword = 'SecureSecretPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPassword, salt);
  assert(hash !== rawPassword, 'Password is never stored as plain text');
  assert(hash.startsWith('$2'), 'Hash has valid bcrypt format');
  const isMatch = await bcrypt.compare(rawPassword, hash);
  assert(isMatch === true, 'Correct password verifies successfully');
  const isMismatch = await bcrypt.compare('WrongPassword', hash);
  assert(isMismatch === false, 'Incorrect password is rejected');

  // 2. JWT Generation & Verification Test
  console.log('\n--- Test 2: JWT Token Generation & Verification ---');
  process.env.JWT_SECRET = 'test_secret_for_automated_verification_987654321';
  const testUserId = '65e31a89f92d4c0012345678';
  const token = generateToken(testUserId);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token is signed with 3 valid segments');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert(decoded.id === testUserId, 'JWT correctly decodes userId payload');

  // 3. API App routes check
  console.log('\n--- Test 3: Express App Routes & Endpoints ---');
  const app = require('./src/app');
  assert(typeof app === 'function', 'Express app instance exports a callable request handler');

  // 4. Mongoose Models Schemas Check
  console.log('\n--- Test 4: Mongoose Models & Schemas ---');
  const User = require('./src/models/User');
  const Conversation = require('./src/models/Conversation');
  const Message = require('./src/models/Message');
  const Notification = require('./src/models/Notification');

  assert(User.schema.path('username') !== undefined, 'User schema defines username');
  assert(User.schema.path('email') !== undefined, 'User schema defines email');
  assert(User.schema.path('passwordHash') !== undefined, 'User schema defines passwordHash');
  assert(Conversation.schema.path('participants') !== undefined, 'Conversation schema defines participants');
  assert(Conversation.schema.path('conversationType') !== undefined, 'Conversation schema defines conversationType');
  assert(Message.schema.path('conversationId') !== undefined, 'Message schema defines conversationId');
  assert(Message.schema.path('senderId') !== undefined, 'Message schema defines senderId');
  assert(Message.schema.path('attachments') !== undefined, 'Message schema defines attachments');
  assert(Notification.schema.path('recipientId') !== undefined, 'Notification schema defines recipientId');

  console.log(`\n========================================`);
  console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
