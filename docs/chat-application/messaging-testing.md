# Messaging Testing Documentation

## Overview

This document provides comprehensive testing documentation for ALL messaging features in the Ryland LMS chat application, including core messaging functionality and the new message attachments feature.

## Purpose

- Document all test scenarios for messaging features
- Provide guidance for writing integration tests
- Ensure consistent test coverage across features
- Help developers understand testing strategies

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install test dependencies
npm install --save-dev mocha chai socket.io-client

# Install attachment-specific dependencies
npm install cheerio axios sharp file-type
```

### Database Preparation

```javascript
import { clearTestDatabase } from "../../helpers/database";

before(async function() {
  await clearTestDatabase();
  // Create test data...
});
```

### Socket Client Setup

```javascript
import { io as ioClient } from 'socket.io-client';

const socketUrl = `http://localhost:${port}`;
const socket = ioClient(socketUrl, {
  path: '/chat-socket/',
  query: { token: jwtToken },
  transports: ['websocket'],
});
```

### Authentication Setup

```javascript
const auth = await app.service("authentication").create({
  strategy: "otp",
  mobileNo: user.mobileNo,
  otp: testOTP
}, {});

const token = auth.accessToken;
```

### Test Data Factories

```javascript
// Create test users
async function createTestUser(data) {
  return await usersModel.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: `${data.email}_${Date.now()}@test.com`,
    mobileNo: `+1${Date.now()}${data.id}`,
    role: "Student",
    status: "Active",
    schoolId: testSchoolId,
    otp: 111111,
    otpGeneratedAt: new Date()
  });
}

// Create test conversation
async function createTestConversation(user1Id, user2Id) {
  return await conversationsModel.create({
    participants: [user1Id, user2Id],
    lastMessage: {},
    lastMessageAt: new Date(),
    unreadCount: {},
    isActive: true
  });
}
```

## Core Messaging Tests (Existing)

### Message Send/Receive Tests

**Location:** `test/services/messages/`

#### Test: Basic message sending
- User1 connects to socket
- User2 connects to socket
- User1 emits `message:send` event
- **Verify:**
  - Message saved to database
  - User2 receives `message:receive` event
  - User1 receives `message:delivered` event
  - Conversation updated with last message

#### Test: Message delivery confirmation
- Send message from User1 to User2
- Verify `delivered` status updated when recipient online
- **Verify:**
  - `status.delivered` = true in database
  - `status.deliveredAt` timestamp set

#### Test: Offline message handling
- User2 disconnects
- User1 sends message
- **Verify:**
  - Message saved to database
  - `status.delivered` = false
  - No socket event emitted (recipient offline)

### Message Reply Tests

**Location:** `test/services/messages/message-reply.integration.test.ts`

#### Test: Reply to existing message
- Create original message
- Send reply with `replyToMessageId`
- **Verify:**
  - Reply saved with reply metadata
  - Reply.messageId references original
  - Reply.content contains preview (max 200 chars)
  - Reply.senderId matches original sender

#### Test: Reply validation
- Attempt to reply to deleted message
- Attempt to reply to non-existent message
- **Verify:**
  - Appropriate error returned
  - No reply created

#### Test: Reply preview content
- Reply to long message (>200 chars)
- **Verify:**
  - Preview truncated to 200 chars
  - Ends with "..."

### Message Reactions Tests

**Location:** `test/services/message-reactions/`

#### Test: Add reaction
- User1 adds reaction to message
- **Verify:**
  - Reaction added to message.reactions array
  - reactionCounts updated
  - Other user receives `reaction:updated` event

#### Test: Change reaction
- User1 has existing reaction
- User1 adds different reaction
- **Verify:**
  - Old reaction removed
  - New reaction added
  - Counts updated correctly

#### Test: Remove reaction
- User1 removes reaction
- **Verify:**
  - Reaction removed from array
  - Counts decremented
  - Event emitted

#### Test: Multiple users reactions
- Multiple users react to same message
- **Verify:**
  - Each user can have one reaction
  - Counts aggregate correctly
  - total count = sum of all reactions

### Message Read Status Tests

#### Test: Mark messages as read
- User opens conversation
- Emit `message:read` event
- **Verify:**
  - All unread messages marked as read
  - `status.read` = true
  - `status.readAt` timestamp set
  - unreadCount reset to 0

#### Test: Read receipts
- User1 marks messages as read
- **Verify:**
  - User2 (sender) receives `message:read` event
  - Event contains messageIds and readAt timestamp

#### Test: Unread count updates
- Send multiple messages
- **Verify:**
  - unreadCount increments for each message
  - unreadCount resets when marked as read

### Message Edit/Delete Tests

#### Test: Edit message content
- User edits their own message
- **Verify:**
  - Content updated
  - isEdited = true
  - editedAt timestamp set
  - originalContent preserved
  - Other user receives `message:update` event

#### Test: Delete message
- User deletes their own message
- **Verify:**
  - isDeleted = true (soft delete)
  - deletedAt timestamp set
  - deletedBy set to user ID
  - Other user receives `message:delete` event

#### Test: Edit/delete authorization
- User attempts to edit another user's message
- **Verify:**
  - Operation rejected with Forbidden error

## Message Attachments Tests (New)

**Location:** `test/services/message-attachments/message-attachments.test.ts`

### 1. Real S3 Upload Test (No Mocking)

**Purpose:** Verify actual S3 integration works

```javascript
it("should upload a real test image to S3 and verify acceptance", async function() {
  // Create test image buffer (1x1 PNG)
  const testImageBuffer = Buffer.from('base64data', 'base64');
  
  // Request presigned URL
  const urlResponse = await app.service('message-attachments-upload').create({
    controller: 'createPresignedUrl',
    filename: 'test.png',
    fileSize: testImageBuffer.length,
    mimeType: 'image/png',
    attachmentType: 'image'
  }, { user: { _id: userId } });
  
  // Upload to S3 (REAL UPLOAD)
  const uploadResponse = await axios.put(urlResponse.signedUrl, testImageBuffer, {
    headers: { 'Content-Type': 'image/png' }
  });
  
  // Verify S3 accepted
  assert.ok([200, 204].includes(uploadResponse.status));
  
  // Verify file is accessible
  const verifyResponse = await axios.head(urlResponse.objectUrl);
  assert.strictEqual(verifyResponse.status, 200);
});
```

**Verify:**
- Presigned URL generated
- File uploads to S3 successfully
- File is accessible via object URL
- Gracefully handles network issues (skip test if offline)

### 2. Single Image Attachment

**Setup:**
- Upload image via message-attachments-upload API
- Send message with image via socket

**Server-side Verification:**
- Message saved with 1 attachment
- Attachment type = 'image'
- Thumbnail URL generated and stored
- Image dimensions (width, height) in metadata
- One conversation-attachments record created

**Client-side Verification:**
- Sender receives `message:delivered` event
- Recipient receives `message:receive` event
- Attachment object contains: url, thumbnail, dimensions, metadata

### 3. Multiple Attachments (Image + Document)

**Setup:**
- Upload 1 image and 1 document
- Send message with both attachments

**Server-side Verification:**
- Message saved with 2 attachments
- First attachment type = 'image' with thumbnail
- Second attachment type = 'document'
- Both have correct metadata
- Two conversation-attachments records created

**Client-side Verification:**
- Sender receives `message:delivered`
- Recipient receives `message:receive`
- Payload contains 2 attachments
- Image includes thumbnail URL
- Document includes metadata
- Test both online and offline scenarios

### 4. Auto Link Preview Extraction

**Setup:**
- Send message with URL in content
- No link attachment provided

**Server-side Verification:**
- Server detects URL in content
- Server calls link preview utility
- Link preview fetched (title, description, image, siteName)
- Link attachment automatically added

**Client-side Verification:**
- Recipient receives message
- Message contains auto-generated link attachment
- Preview metadata complete

### 5. Client-Provided Link Preview

**Setup:**
- Client pre-fetches preview using `message:link-preview` event
- Client sends message with preview data

**Server-side Verification:**
- Server accepts client-provided data
- No additional fetch performed
- Message saved with link attachment

**Client-side Verification:**
- Preview data matches what client provided
- No modifications to metadata

### 6. Reply with Attachments

**Setup:**
- Create existing message
- Upload document
- Send reply with attachment

**Server-side Verification:**
- Reply saved with both reply metadata and attachment
- Reply.messageId references original
- Attachment stored in attachments array
- Conversation-attachments record created

**Client-side Verification:**
- Recipient receives `message:reply:receive`
- Event contains both reply data and attachment
- Reply structure includes original message preview

### 7. Filter Attachments by Type

**Setup:**
- Create conversation with:
  - 3 messages with image attachments
  - 2 messages with document attachments
  - 2 messages with link attachments

**Test: Filter by images**
```javascript
GET /conversation-attachments?conversationId=xxx&type=image
```
- Returns only 3 image attachments
- Each has thumbnail URL

**Test: Filter by documents**
```javascript
GET /conversation-attachments?conversationId=xxx&type=document
```
- Returns only 2 document attachments
- Each has document metadata

**Test: Filter by links**
```javascript
GET /conversation-attachments?conversationId=xxx&type=link
```
- Returns only 2 link attachments
- Each has preview metadata

**Test: No filter**
```javascript
GET /conversation-attachments?conversationId=xxx
```
- Returns all 7 attachments
- Correct ordering (createdAt descending)

**Test: Pagination**
```javascript
GET /conversation-attachments?conversationId=xxx&$limit=3&$skip=0
```
- Returns first 3 attachments
- Subsequent page returns next 3
- No overlap between pages

### 8. Attachment Validation

**Test: Oversized image (>10MB)**
```javascript
await app.service('message-attachments-upload').create({
  controller: 'createPresignedUrl',
  filename: 'huge.jpg',
  fileSize: 15 * 1024 * 1024,
  mimeType: 'image/jpeg',
  attachmentType: 'image'
});
```
- **Verify:** Error thrown mentioning size limit

**Test: Oversized document (>25MB)**
- Same as above with 30MB document
- **Verify:** Error mentions 25MB limit

**Test: Invalid file type**
```javascript
await app.service('message-attachments-upload').create({
  controller: 'createPresignedUrl',
  filename: 'malware.exe',
  mimeType: 'application/x-msdownload',
  attachmentType: 'document'
});
```
- **Verify:** Error mentions invalid type

**Test: Malformed attachment via socket**
```javascript
socket.emit('message:send', {
  recipientId: userId,
  content: "Test",
  attachments: [{ type: 'image' }] // Missing url
});
```
- **Verify:** `message:error` event received
- Error describes validation failure

### 9. Link Preview Event

**Test: Successful preview fetch**
```javascript
socket.emit('message:link-preview', {
  url: 'https://example.com',
  tempId: 'preview-123'
});
```
- **Verify:** `message:link-preview:result` received
- Contains tempId and preview data

**Test: Failed preview fetch**
```javascript
socket.emit('message:link-preview', {
  url: 'not-a-valid-url',
  tempId: 'preview-456'
});
```
- **Verify:** `message:link-preview:result` with error
- Error is descriptive

**Test: Timeout handling**
- Mock slow response
- **Verify:** Timeout after 5 seconds
- Error response received

### 10. Access Control

**Test: Non-participant access denied**
- User3 (not in conversation) attempts to access attachments
- **Verify:** Forbidden error
- Error mentions participant requirement

## Mock Strategies

### Socket.IO Events

```javascript
// Mock socket events
socket.on('message:receive', (data) => {
  // Assertions here
  done();
});

// Emit event
socket.emit('message:send', payload);
```

### S3 Upload/Download

**For Real S3 Test (Test #1):**
- No mocking - use actual S3
- Handle network errors gracefully
- Skip test if S3 unavailable

**For Other Tests:**
- Use test URLs (https://example.com/...)
- Don't actually upload to S3
- Focus on logic, not infrastructure

### Link Preview Fetching

```javascript
// Mock axios for link preview
const mockPreview = {
  title: 'Test Page',
  description: 'Test description',
  url: 'https://example.com'
};

// In test, provide preview data directly
```

### Sharp Image Processing

```javascript
// For tests, use small test images
const testImageBuffer = Buffer.from('base64string', 'base64');

// Or provide pre-generated thumbnails
```

### Database Operations

```javascript
// Use test database
await clearTestDatabase();

// Create test data
const testMessage = await messagesModel.create({...});
```

## Testing Utilities & Helpers

### Helper: Create Test Users

```javascript
async function createTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({ 
      firstName: `User${i}`,
      id: i 
    });
    users.push(user);
  }
  return users;
}
```

### Helper: Create Test Attachments

```javascript
function createTestImageAttachment(url) {
  return {
    type: 'image',
    url: url || 'https://example.com/test.jpg',
    metadata: {
      filename: 'test.jpg',
      size: 50000,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      thumbnail: 'https://example.com/thumb.jpg'
    }
  };
}

function createTestDocumentAttachment(url) {
  return {
    type: 'document',
    url: url || 'https://example.com/test.pdf',
    metadata: {
      filename: 'test.pdf',
      size: 100000,
      mimeType: 'application/pdf'
    }
  };
}
```

### Helper: Upload Test Files

```javascript
async function uploadTestFile(filename, fileSize, mimeType, attachmentType, userId) {
  return await app.service('message-attachments-upload').create({
    controller: 'createPresignedUrl',
    filename,
    fileSize,
    mimeType,
    attachmentType
  }, {
    user: { _id: userId }
  });
}
```

### Helper: Verify Socket Events

```javascript
function waitForSocketEvent(socket, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeout);
    
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Usage
const data = await waitForSocketEvent(socket, 'message:receive');
assert.ok(data.id);
```

### Helper: Database Assertions

```javascript
async function assertMessageExists(messageId) {
  const message = await messagesModel.findById(messageId);
  assert.ok(message, "Message should exist in database");
  return message;
}

async function assertConversationAttachmentsCount(conversationId, expectedCount) {
  const count = await conversationAttachmentsModel.countDocuments({ conversationId });
  assert.strictEqual(count, expectedCount);
}
```

### Reusable Test Fixtures

```javascript
const testFixtures = {
  imageAttachment: {
    type: 'image',
    url: 'https://example.com/image.jpg',
    metadata: {
      filename: 'image.jpg',
      size: 50000,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      thumbnail: 'https://example.com/thumb.jpg'
    }
  },
  // ... more fixtures
};
```

## Running Tests

### Run All Messaging Tests

```bash
npm test -- --grep "Message"
```

### Run Specific Test Suites

```bash
# Core messaging tests
npm test test/services/messages/

# Reaction tests
npm test test/services/message-reactions/

# Attachment tests
npm test test/services/message-attachments/
```

### Run Individual Test Files

```bash
npm test test/services/message-attachments/message-attachments.test.ts
```

### Watch Mode for Development

```bash
npm test -- --watch --grep "Message Attachments"
```

### Debug Mode

```bash
npm test -- --inspect-brk test/services/message-attachments/message-attachments.test.ts
```

## Test Coverage

### Current Coverage Statistics

- Core Messaging: ~85%
- Reactions: ~90%
- Attachments: ~80% (target)

### Coverage Goals

- All critical paths: 100%
- Edge cases: 80%
- Error handling: 90%

### Critical Paths to Test

1. Message send/receive flow
2. Attachment upload and storage
3. Thumbnail generation
4. Link preview extraction
5. Database persistence
6. Socket event delivery
7. Access control
8. Validation logic

### Edge Cases to Consider

- Network failures during upload
- S3 unavailability
- Large file handling
- Invalid URLs in link preview
- Concurrent message sending
- Race conditions in status updates
- Offline/online transitions

## Troubleshooting

### Common Test Failures

**Issue: Socket connection timeout**
```
Solution: Increase timeout or check if chat socket initialized
this.timeout(10000);
```

**Issue: Messages not delivered**
```
Solution: Verify recipient is online and connected
const recipientOnline = connectionManager.isUserOnline(recipientId);
```

**Issue: S3 upload fails**
```
Solution: Check AWS credentials and network connectivity
If testing locally, skip real S3 test
```

**Issue: Thumbnail generation fails**
```
Solution: Verify sharp is installed correctly
npm rebuild sharp
```

### Socket Connection Issues

- Ensure server is running before tests
- Check socket path is correct (`/chat-socket/`)
- Verify JWT token is valid
- Wait for `connect` event before emitting

### S3 Mock Issues

- For real S3 test, handle gracefully if offline
- For mocked tests, use example.com URLs
- Don't rely on external services for unit tests

### Socket Event Timing Issues

```javascript
// Add delays between operations
setTimeout(() => {
  socket.emit('message:send', data);
}, 500);

// Or use promises
await new Promise(resolve => setTimeout(resolve, 500));
```

### Database Cleanup Between Tests

```javascript
afterEach(async function() {
  // Clean up test data
  await messagesModel.deleteMany({});
  await conversationAttachmentsModel.deleteMany({});
});
```

### Port Conflicts

```javascript
// Use unique port for tests
const port = app.get("port") || (3030 + Math.floor(Math.random() * 100));
```

## Test File Structure

### All Messaging Test Files

```
test/services/
├── messages/
│   ├── messages.test.ts              // Basic message tests
│   └── message-reply.integration.test.ts // Reply tests
├── message-reactions/
│   ├── message-reactions.test.ts
│   ├── message-reactions-basic.test.ts
│   └── message-reactions-simple.test.ts
├── message-attachments/              // NEW
│   └── message-attachments.test.ts   // Attachment tests
└── conversation-attachments/         // NEW
    └── conversation-attachments.test.ts // Attachment filtering tests
```

## Best Practices

1. **Always clean database before tests**
2. **Use unique identifiers (timestamps)**
3. **Test both happy path and error cases**
4. **Verify both database and socket events**
5. **Use descriptive test names**
6. **Keep tests independent**
7. **Mock external dependencies (except Test #1)**
8. **Use timeouts appropriately**
9. **Clean up resources in `after` hooks**
10. **Document complex test scenarios**

## References

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
- [Integration Testing Guide](../INTEGRATION_TESTING_GUIDE.md)
