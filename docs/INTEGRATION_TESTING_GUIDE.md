# Integration Testing Guide - Ryland LMS API

A comprehensive guide for writing and running integration tests based on lessons learned from implementing the message reactions feature.

## Table of Contents
1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Socket.IO Integration Testing](#socketio-integration-testing)
4. [MongoDB Integration Testing](#mongodb-integration-testing)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Best Practices](#best-practices)
7. [Test Patterns](#test-patterns)
8. [Debugging Tips](#debugging-tips)

---

## Overview

Integration tests verify that different parts of the system work together correctly. Unlike unit tests, they require:
- Real database connections (MongoDB)
- Real service dependencies (Redis)
- Network access
- Actual server initialization

### Key Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Dependencies | Mocked | Real |
| Speed | Fast (ms) | Slower (seconds) |
| Isolation | Complete | Minimal |
| Database | Not required | Required |
| Network | Not required | Required |

---

## Test Environment Setup

### 1. Required Services

**MongoDB** (Test Database)
```bash
# Ensure MongoDB is running
mongosh

# Check test database exists
use ryland_lms_test
```

**Redis** (Background Jobs)
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Or check service status
brew services list | grep redis
```

### 2. Environment Configuration

**Test Configuration** (`config/test.json`)
```json
{
  "mongodb": {
    "CONNECTION_STRING": "mongodb://127.0.0.1:27017",
    "DB_NAME": "ryland_lms_test"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  }
}
```

**Key Points:**
- Always use a separate database for tests (suffix with `_test`)
- Never run tests against production database
- The `NODE_ENV=test` check in `clearTestDatabase()` prevents accidental data loss

### 3. Package Dependencies

**Essential Testing Packages:**
```json
{
  "devDependencies": {
    "mocha": "^10.x",
    "ts-node": "^10.x",
    "@types/mocha": "^10.x",
    "socket.io-client": "4.5.4"  // Must match server version!
  },
  "dependencies": {
    "socket.io": "4.5.4"
  }
}
```

**Critical:** Socket.IO client and server versions MUST match:
- ❌ `socket.io@4.5.4` + `socket.io-client@2.4.0` = Connection errors
- ✅ `socket.io@4.5.4` + `socket.io-client@4.5.4` = Works perfectly

---

## Socket.IO Integration Testing

### 1. Test File Structure

```typescript
import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import { io } from 'socket.io-client';  // v4 API

describe("Feature Socket Tests", () => {
  let server: any;
  let socket: any;
  let authToken: string;
  let testUserId: any;

  before(async function() {
    this.timeout(20000);  // Socket tests need more time
    
    // 1. Start server
    const port = app.get("port") || 3034;
    server = app.listen(port);
    
    // 2. Initialize chat socket
    app.set("server", server);
    const initializeChatSocket = require('../../../src/socket/chatSocket');
    initializeChatSocket(app);
    
    // 3. Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Clear database
    await clearTestDatabase();
    
    // 5. Create test user and get token
    // ... create user logic ...
    
    // 6. Connect socket
    socket = io(`http://localhost:${port}`, {
      path: '/chat-socket/',
      query: { token: authToken },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000
    });
    
    // 7. Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  after(async function() {
    this.timeout(10000);
    
    // Disconnect socket
    if (socket) socket.disconnect();
    
    // Close server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    
    // Clear database
    await clearTestDatabase();
  });

  // Tests go here...
});
```

### 2. Socket.IO v4 API Changes

**Old (v2):**
```javascript
const ioClient = require('socket.io-client');
const socket = ioClient('http://localhost:3030');
```

**New (v4):**
```typescript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3030', options);
```

### 3. Handling Socket Events in Tests

**❌ Bad - Multiple `done()` calls:**
```typescript
it('should handle event', function(done) {
  socket.on('event', (data) => {
    assert.ok(data);
    done();  // Called every time event fires!
  });
  
  socket.emit('trigger');
});
```

**✅ Good - Proper event cleanup:**
```typescript
it('should handle event', function(done) {
  let doneCalled = false;
  
  const handler = (data) => {
    if (!doneCalled) {
      doneCalled = true;
      socket.off('event', handler);  // Remove listener!
      
      try {
        assert.ok(data);
        done();
      } catch (error) {
        done(error);
      }
    }
  };
  
  socket.on('event', handler);
  socket.emit('trigger');
});
```

**✅ Alternative - Use `once()`:**
```typescript
it('should handle event', function(done) {
  socket.once('event', (data) => {  // Automatically removes after first call
    try {
      assert.ok(data);
      done();
    } catch (error) {
      done(error);
    }
  });
  
  socket.emit('trigger');
});
```

### 4. Testing Real-Time Broadcasting

```typescript
it('should broadcast to all participants', async function() {
  this.timeout(10000);
  
  const receivedEvents = [];
  
  // Set up listeners on multiple sockets
  const promises = [socket1, socket2, socket3].map(sock => {
    return new Promise<void>(resolve => {
      sock.once('message:updated', (data) => {
        receivedEvents.push(data);
        resolve();
      });
    });
  });
  
  // Trigger the broadcast
  socket1.emit('message:send', { content: 'Hello' });
  
  // Wait for all to receive
  await Promise.all(promises);
  
  // Verify all received
  assert.strictEqual(receivedEvents.length, 3);
});
```

### 5. Socket Authentication

**Chat Socket Authentication Pattern:**
```typescript
// Token can be passed via query or auth
const socket = io(url, {
  query: { token: authToken },     // ✅ Works
  // OR
  auth: { token: authToken },      // ✅ Also works
});
```

**Server-side (chatAuth.js):**
```javascript
const token = socket.handshake.query.token || socket.handshake.auth.token;
```

---

## MongoDB Integration Testing

### 1. Test Database Helpers

**`test/helpers/database.ts`:**
```typescript
export async function clearTestDatabase(): Promise<void> {
  // Safety check
  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ Cannot clear database outside test environment!");
  }

  const dbName = mongoose.connection.db.databaseName;
  if (!dbName.includes("test")) {
    throw new Error(`❌ Database name '${dbName}' does not include 'test'!`);
  }

  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}
```

### 2. Creating Test Data

**Best Practice - Create minimal required data:**
```typescript
before(async function() {
  // Only create what's needed for THIS test suite
  const school = await schoolsModel.create({
    schoolName: "Test School",
    schoolType: "public",
    address: "123 Test St",
    city: "Test City",
    status: "active"
  });

  const user = await usersModel.create({
    firstName: "Test",
    lastName: "User",
    email: `test_${Date.now()}@test.com`,  // Unique!
    mobileNo: `+1${Date.now()}`,           // Unique!
    role: "Student",
    status: "Active",
    schoolId: school._id,
    otp: 111111,
    otpGeneratedAt: new Date()
  });
});
```

**Key Points:**
- Use `Date.now()` for unique identifiers
- Create minimal data (don't copy production DB structure)
- Clean up after tests (`clearTestDatabase()`)

### 3. Testing with Services vs Models

**Using Service (includes hooks):**
```typescript
const message = await app.service("messages").create({
  conversationId: testConvId,
  senderId: userId,
  content: "Test"
}, {
  user: { _id: userId, role: "Student" },
  authenticated: true
});
```

**Using Model (bypasses hooks):**
```typescript
const messagesModel = app.get("mongooseClient").models.messages;
const message = await messagesModel.create({
  conversationId: testConvId,
  senderId: userId,
  content: "Test"
});
```

**When to use each:**
- **Service**: Testing business logic, hooks, permissions
- **Model**: Setting up test data, direct DB operations

---

## Common Issues & Solutions

### Issue 1: Socket Connection Fails

**Error:**
```
Socket connection error: xhr poll error
```

**Causes & Solutions:**

1. **Version Mismatch**
   ```bash
   # Check versions match
   grep socket.io package.json
   
   # Fix: Upgrade client to match server
   yarn add socket.io-client@4.5.4
   ```

2. **Chat Socket Not Initialized**
   ```typescript
   // Add to test before() hook:
   app.set("server", server);
   const initializeChatSocket = require('../../../src/socket/chatSocket');
   initializeChatSocket(app);
   ```

3. **Wrong Path**
   ```typescript
   // ❌ Wrong
   io('http://localhost:3030/chat-socket')
   
   // ✅ Correct
   io('http://localhost:3030', { path: '/chat-socket/' })
   ```

### Issue 2: Authentication Failures in Socket Connections

**Error:**
```
Authentication required
Error during chat socket connection setup
```

**Solution - Add `provider` to service calls:**
```javascript
// In chatSocket.js connection handler:
const enrollments = await app.service("class-enrollments").find({
  query: { studentId: user._id },
  paginate: false,
  provider: 'socketio'  // ✅ Bypasses auth hooks
});
```

### Issue 3: Tests Timeout

**Common Causes:**

1. **Forgot to call `done()`**
   ```typescript
   it('test', function(done) {
     socket.on('event', (data) => {
       assert.ok(data);
       // ❌ Missing done()!
     });
   });
   ```

2. **Event never fires**
   - Add debug logging
   - Check event name spelling
   - Verify handler is registered

3. **Database not ready**
   ```typescript
   // Add timeout for DB operations
   before(async function() {
     this.timeout(20000);  // Increase from default 2000ms
     await clearTestDatabase();
   });
   ```

### Issue 4: TypeScript Compilation Errors

**Error:**
```
error TS2769: No overload matches this call
```

**Solution - Use type assertions:**
```typescript
app.configure(
  socketio(
    { maxHttpBufferSize: 5 * 1e9 } as any,  // Type assertion
    function (io) { /* ... */ }
  )
);
```

### Issue 5: Redis Connection Required

**Error:**
```
Error: connect EPERM 127.0.0.1:6379
```

**Solution:**
```bash
# Start Redis
brew services start redis

# Verify it's running
redis-cli ping
```

**Why needed:** BullMQ queues (used in app initialization) require Redis even in test mode.

---

## Best Practices

### 1. Test Organization

```
test/
├── helpers/
│   └── database.ts          # Shared test utilities
├── services/
│   └── feature/
│       ├── feature.test.ts           # Main integration tests
│       ├── feature-logic.test.js     # Pure logic tests (no deps)
│       └── feature-integration.test.js # Verification tests
```

### 2. Test Naming

```typescript
describe("Feature Name - Type", () => {
  it("Test 1: Should do X when Y", () => {});
  it("Test 2: Should handle error case Z", () => {});
  it("Test 3: Should validate input A", () => {});
});
```

### 3. Isolation

**Each test should be independent:**
```typescript
beforeEach(async function() {
  // Reset state before EACH test
  await messagesModel.findByIdAndUpdate(testMessageId, {
    reactions: [],
    reactionCounts: { /* defaults */ }
  });
});
```

### 4. Timeouts

```typescript
describe("Suite", () => {
  // Default for all tests in suite
  this.timeout(10000);
  
  it("specific test", function() {
    // Override for this test only
    this.timeout(5000);
  });
});
```

### 5. Async/Await vs Callbacks

**✅ Prefer async/await:**
```typescript
it('test', async function() {
  const result = await doSomething();
  assert.ok(result);
});
```

**When you must use callbacks (socket events):**
```typescript
it('test', function(done) {
  socket.once('event', (data) => {
    try {
      assert.ok(data);
      done();
    } catch (error) {
      done(error);  // Always pass errors to done()
    }
  });
});
```

---

## Test Patterns

### Pattern 1: Sequential Event Testing

Testing a series of events that depend on each other:

```typescript
it('should handle reaction lifecycle', async function() {
  this.timeout(15000);
  
  // 1. Add reaction
  await new Promise<void>((resolve, reject) => {
    socket.once('reaction:updated', (data) => {
      try {
        assert.strictEqual(data.action, 'added');
        assert.strictEqual(data.reactionCounts.thumbs_up, 1);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    socket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'thumbs_up'
    });
  });
  
  // 2. Change reaction
  await new Promise<void>((resolve, reject) => {
    socket.once('reaction:updated', (data) => {
      try {
        assert.strictEqual(data.action, 'changed');
        assert.strictEqual(data.reactionCounts.heart, 1);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    socket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'heart'
    });
  });
  
  // 3. Remove reaction
  await new Promise<void>((resolve, reject) => {
    socket.once('reaction:updated', (data) => {
      try {
        assert.strictEqual(data.action, 'removed');
        assert.strictEqual(data.reactionCounts.total, 0);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    socket.emit('reaction:remove', {
      messageId: testMessageId
    });
  });
});
```

### Pattern 2: Multi-Client Testing

Testing real-time features with multiple clients:

```typescript
it('should broadcast to all participants', async function() {
  const received = { user1: false, user2: false, user3: false };
  
  const waitForAll = Promise.all([
    new Promise<void>(resolve => {
      socket1.once('message:new', () => {
        received.user1 = true;
        resolve();
      });
    }),
    new Promise<void>(resolve => {
      socket2.once('message:new', () => {
        received.user2 = true;
        resolve();
      });
    }),
    new Promise<void>(resolve => {
      socket3.once('message:new', () => {
        received.user3 = true;
        resolve();
      });
    })
  ]);
  
  socket1.emit('message:send', { content: 'Hello all' });
  
  await waitForAll;
  
  assert.ok(received.user1 && received.user2 && received.user3);
});
```

### Pattern 3: Error Testing

Testing error cases and validation:

```typescript
it('should reject invalid input', function(done) {
  this.timeout(5000);
  
  socket.once('reaction:error', (error) => {
    try {
      assert.ok(error.error.includes('Invalid reaction type'));
      assert.strictEqual(error.messageId, testMessageId);
      done();
    } catch (err) {
      done(err);
    }
  });
  
  socket.emit('reaction:add', {
    messageId: testMessageId,
    reactionType: 'invalid_type'  // Should trigger error
  });
});
```

### Pattern 4: State Verification

Verifying database state after operations:

```typescript
it('should update database correctly', async function() {
  // Perform action
  socket.emit('reaction:add', {
    messageId: testMessageId,
    reactionType: 'thumbs_up'
  });
  
  // Wait for event
  await new Promise<void>(resolve => {
    socket.once('reaction:updated', () => resolve());
  });
  
  // Verify database state
  const message = await messagesModel.findById(testMessageId).lean();
  
  assert.strictEqual(message.reactions.length, 1);
  assert.strictEqual(message.reactions[0].reactionType, 'thumbs_up');
  assert.strictEqual(message.reactionCounts.thumbs_up, 1);
  assert.strictEqual(message.reactionCounts.total, 1);
});
```

---

## Debugging Tips

### 1. Add Logging

```typescript
it('test', function(done) {
  console.log('1. Starting test');
  
  socket.once('event', (data) => {
    console.log('2. Event received:', data);
    try {
      assert.ok(data);
      console.log('3. Assertion passed');
      done();
    } catch (error) {
      console.log('4. Assertion failed:', error);
      done(error);
    }
  });
  
  console.log('5. Emitting trigger');
  socket.emit('trigger', { test: true });
});
```

### 2. Check Server Logs

Look for these in test output:
```
Chat socket authentication attempt: [socket-id]
Chat socket authenticated: [socket-id] (User: [user-id])
Reaction Add Event: { messageId, reactionType, userId }
Reaction updated: { ... }
```

### 3. Test Connection Separately

```typescript
it('should connect successfully', function(done) {
  this.timeout(5000);
  
  const testSocket = io('http://localhost:3034', {
    path: '/chat-socket/',
    query: { token: authToken }
  });
  
  testSocket.on('connect', () => {
    console.log('✅ Connected:', testSocket.id);
    testSocket.disconnect();
    done();
  });
  
  testSocket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
    done(error);
  });
});
```

### 4. Run Single Test

```bash
# Run only one test file
NODE_ENV=test npx mocha test/services/feature/feature.test.ts

# Run only tests matching pattern
NODE_ENV=test npx mocha test/services/feature/feature.test.ts --grep "should add reaction"
```

### 5. Increase Verbosity

```bash
# Add DEBUG output
DEBUG=socket.io* NODE_ENV=test npx mocha test/...

# Or add --reporter spec for detailed output
NODE_ENV=test npx mocha test/... --reporter spec
```

---

## Running Tests

### Complete Test Suite

```bash
# All tests
NODE_ENV=test npm test

# With timeout
NODE_ENV=test npx mocha test/**/*.test.ts --timeout 60000 --exit
```

### Integration Tests Only

```bash
# Specific feature
NODE_ENV=test npx mocha test/services/message-reactions/*.test.ts --timeout 60000 --exit

# JavaScript tests only (no TypeScript compilation)
NODE_ENV=test npx mocha test/services/message-reactions/*.test.js
```

### With Coverage

```bash
NODE_ENV=test npx nyc mocha test/**/*.test.ts
```

---

## Checklist for New Integration Tests

- [ ] Services running (MongoDB, Redis)
- [ ] Test database configured
- [ ] Dependencies installed (socket.io-client version matches server)
- [ ] Test file structure follows conventions
- [ ] `before()` hook initializes everything
- [ ] `after()` hook cleans up everything  
- [ ] Socket listeners properly removed (`socket.off()` or `once()`)
- [ ] Timeouts set appropriately
- [ ] Error cases tested
- [ ] Database state verified
- [ ] Tests are independent (no shared state)
- [ ] Unique identifiers used (`Date.now()`)
- [ ] Clear test names describing behavior

---

## Summary

**Key Takeaways:**

1. **Version Compatibility Matters** - socket.io client/server must match
2. **Proper Cleanup** - Always remove event listeners to prevent "done() called multiple times"
3. **Authentication** - Pass `provider: 'socketio'` to bypass auth hooks in socket context
4. **Timeouts** - Socket tests need longer timeouts (10-20 seconds)
5. **Isolation** - Each test should be independent
6. **Real Services** - Integration tests require real MongoDB and Redis

**Resources:**
- Message Reactions Tests: `test/services/message-reactions/`
- Database Helpers: `test/helpers/database.ts`
- Socket Events Documentation: `docs/chat-application/socket-events.md`

---

*Last Updated: January 2026*
*Based on: Message Reactions Feature Implementation*
