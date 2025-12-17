# Socket Events Documentation

## Connection

### Establishing Connection

Connect to the chat socket server using Socket.IO client:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3030', {
  path: '/chat-socket/',
  query: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Connection Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | **Yes** | JWT authentication token |
| `path` | string | **Yes** | Must be `/chat-socket/` |
| `transports` | array | No | Transport methods (default: `['websocket', 'polling']`) |

### Connection Events

**`connect`** - Successfully connected to server

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

**`disconnect`** - Disconnected from server

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**`connect_error`** - Connection error

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Common errors:
  // - "Authentication token required"
  // - "Invalid authentication token"
  // - "User not found"
});
```

---

## Client to Server Events

Events that clients emit to the server.

### Message Events

#### `message:send`

Send a new message to another user.

**Payload:**

```typescript
{
  recipientId: string;        // Required: User ID of recipient
  content: string;            // Required: Message content
  tempId?: string;           // Optional: Client-side temporary ID for optimistic updates
  conversationId?: string;   // Optional: Existing conversation ID (auto-created if not provided)
}
```

**Example:**

```javascript
socket.emit('message:send', {
  recipientId: 'user123',
  content: 'Hello, how are you?',
  tempId: 'temp-' + Date.now(),
  conversationId: 'conv456'  // Optional
});
```

**Server Responses:**
- `message:delivered` - Message was successfully sent
- `message:error` - Failed to send message

---

#### `message:read`

Mark a message as read.

**Payload:**

```typescript
{
  messageId: string;  // Required: Message ID to mark as read
  senderId: string;   // Required: User ID of the message sender
}
```

**Example:**

```javascript
socket.emit('message:read', {
  messageId: 'msg789',
  senderId: 'user123'
});
```

**Server Responses:**
- The sender receives `message:read` confirmation

---

#### `message:update`

Edit an existing message (sender only).

**Payload:**

```typescript
{
  messageId: string;     // Required: Message ID to update
  content: string;       // Required: New message content
  recipientId: string;   // Required: Recipient user ID
}
```

**Example:**

```javascript
socket.emit('message:update', {
  messageId: 'msg789',
  content: 'Updated message content',
  recipientId: 'user123'
});
```

**Server Responses:**
- Sender receives `message:update` confirmation
- Recipient receives `message:update` notification
- `message:error` if operation fails

---

#### `message:delete`

Delete a message (sender only, soft delete).

**Payload:**

```typescript
{
  messageId: string;     // Required: Message ID to delete
  recipientId: string;   // Required: Recipient user ID
}
```

**Example:**

```javascript
socket.emit('message:delete', {
  messageId: 'msg789',
  recipientId: 'user123'
});
```

**Server Responses:**
- Sender receives `message:delete` confirmation
- Recipient receives `message:delete` notification
- `message:error` if operation fails

---

### Typing Events

#### `typing:start`

Notify recipient that user started typing.

**Payload:**

```typescript
{
  recipientId: string;  // Required: User ID of recipient
}
```

**Example:**

```javascript
socket.emit('typing:start', {
  recipientId: 'user123'
});
```

**Server Responses:**
- Recipient receives `typing:start` notification (if online)

---

#### `typing:stop`

Notify recipient that user stopped typing.

**Payload:**

```typescript
{
  recipientId: string;  // Required: User ID of recipient
}
```

**Example:**

```javascript
socket.emit('typing:stop', {
  recipientId: 'user123'
});
```

**Server Responses:**
- Recipient receives `typing:stop` notification (if online)

---

## Server to Client Events

Events that the server emits to clients.

### User Presence Events

#### `user:online`

A user came online (school-aware: only sent to relevant users).

**Payload:**

```typescript
{
  userId: string;       // User ID who came online
  userRole: string;     // User role (admin, teacher, student)
  timestamp: string;    // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('user:online', (data) => {
  console.log(`User ${data.userId} (${data.userRole}) came online`);
  // Update UI to show user as online
});
```

**Broadcasting Rules:**
- **Students**: Broadcast to teachers in their classes + classmates
- **Teachers**: Broadcast to all teachers + their students
- **Admins**: Broadcast to all users in their school

---

#### `user:offline`

A user went offline (last connection closed).

**Payload:**

```typescript
{
  userId: string;       // User ID who went offline
  timestamp: string;    // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('user:offline', (data) => {
  console.log(`User ${data.userId} went offline`);
  // Update UI to show user as offline
});
```

---

### Message Events

#### `message:receive`

Receive a new message from another user.

**Payload:**

```typescript
{
  id: string;              // Database message ID
  tempId?: string;         // Client's temporary ID (if provided)
  from: string;            // Sender user ID
  to: string;              // Recipient user ID (you)
  content: string;         // Message content
  timestamp: string;       // ISO 8601 timestamp
  status: 'sent';          // Message status
  conversationId: string;  // Conversation ID
}
```

**Example:**

```javascript
socket.on('message:receive', (message) => {
  console.log('New message from', message.from, ':', message.content);
  // Add message to UI
  // Send read receipt if user is viewing conversation
  socket.emit('message:read', {
    messageId: message.id,
    senderId: message.from
  });
});
```

---

#### `message:delivered`

Confirmation that your message was delivered (or saved if recipient offline).

**Payload:**

```typescript
{
  messageId: string;        // Database message ID
  tempId?: string;          // Your temporary ID (if provided)
  timestamp: string;        // ISO 8601 timestamp
  recipientOnline: boolean; // Whether recipient was online
  conversationId: string;   // Conversation ID
}
```

**Example:**

```javascript
socket.on('message:delivered', (data) => {
  console.log('Message delivered:', data.messageId);
  // Update UI: replace tempId with real messageId
  // Update message status to 'delivered' if recipientOnline
});
```

---

#### `message:read`

Notification that your message was read by the recipient.

**Payload:**

```typescript
{
  messageId: string;   // Message ID that was read
  readBy: string;      // User ID who read it
  readAt: string;      // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('message:read', (data) => {
  console.log('Message', data.messageId, 'was read');
  // Update UI: show read receipt (e.g., blue checkmarks)
});
```

---

#### `message:update`

Notification that a message was edited.

**Payload:**

```typescript
{
  messageId: string;     // Message ID that was updated
  content: string;       // New message content
  updatedAt: string;     // ISO 8601 timestamp
  updatedBy: string;     // User ID who updated it
  isEdited: boolean;     // Always true
}
```

**Example:**

```javascript
socket.on('message:update', (data) => {
  console.log('Message', data.messageId, 'was edited');
  // Update message content in UI
  // Show "edited" indicator
});
```

---

#### `message:delete`

Notification that a message was deleted.

**Payload:**

```typescript
{
  messageId: string;    // Message ID that was deleted
  deletedAt: string;    // ISO 8601 timestamp
  deletedBy: string;    // User ID who deleted it
}
```

**Example:**

```javascript
socket.on('message:delete', (data) => {
  console.log('Message', data.messageId, 'was deleted');
  // Remove message from UI or show "Message deleted"
});
```

---

#### `message:error`

Error occurred during a message operation.

**Payload:**

```typescript
{
  error: string;         // Error message
  messageId?: string;    // Message ID (if applicable)
  tempId?: string;       // Temporary ID (if applicable)
  details?: string;      // Additional error details
}
```

**Example:**

```javascript
socket.on('message:error', (error) => {
  console.error('Message error:', error.error);
  // Show error notification to user
  // Remove optimistic message update if tempId provided
});
```

---

### Typing Events

#### `typing:start`

Notification that another user started typing.

**Payload:**

```typescript
{
  userId: string;      // User ID who started typing
  timestamp: string;   // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('typing:start', (data) => {
  console.log('User', data.userId, 'is typing...');
  // Show typing indicator in conversation
});
```

---

#### `typing:stop`

Notification that another user stopped typing.

**Payload:**

```typescript
{
  userId: string;      // User ID who stopped typing
  timestamp: string;   // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on('typing:stop', (data) => {
  console.log('User', data.userId, 'stopped typing');
  // Hide typing indicator
});
```

---

## Event Flow Examples

### Sending a Message

```
Client A                Socket Server              Client B
   |                          |                        |
   |-- message:send --------->|                        |
   |                          |-- save to DB           |
   |                          |-- forward ------------>|
   |<-- message:delivered ----|                        |
   |                          |                        |
   |                          |<-- message:read -------|
   |<-- message:read ---------|                        |
```

### Typing Indicators

```
Client A                Socket Server              Client B
   |                          |                        |
   |-- typing:start --------->|                        |
   |                          |-- forward ------------>|
   |                          |                        |
   |-- typing:stop ---------->|                        |
   |                          |-- forward ------------>|
```

### User Presence

```
Client A                Socket Server              Relevant Users
   |                          |                        |
   |-- connect -------------->|                        |
   |                          |-- query classes        |
   |                          |-- add to manager       |
   |                          |-- broadcast ---------->|
   |                          |                        |
   |-- disconnect ----------->|                        |
   |                          |-- remove connection    |
   |                          |-- broadcast ---------->|
```

---

## Best Practices

### 1. Message Optimistic Updates

Use `tempId` for optimistic UI updates:

```javascript
const tempId = 'temp-' + Date.now();

// Immediately add message to UI with tempId
addMessageToUI({ id: tempId, content: '...', status: 'sending' });

// Send to server
socket.emit('message:send', {
  recipientId: 'user123',
  content: '...',
  tempId: tempId
});

// Replace tempId with real ID when delivered
socket.on('message:delivered', (data) => {
  if (data.tempId === tempId) {
    updateMessageId(tempId, data.messageId);
  }
});
```

### 2. Typing Indicator Debouncing

Debounce typing events to reduce server load:

```javascript
let typingTimeout;

function onTyping() {
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Send typing:start only once
  if (!isTyping) {
    socket.emit('typing:start', { recipientId: 'user123' });
    isTyping = true;
  }
  
  // Auto-stop after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { recipientId: 'user123' });
    isTyping = false;
  }, 3000);
}
```

### 3. Reconnection Handling

Handle reconnections gracefully:

```javascript
socket.on('connect', () => {
  console.log('Connected');
  // Fetch any messages received while offline
  fetchRecentMessages();
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnect needed
    socket.connect();
  }
  // Auto reconnection will handle other cases
});
```

### 4. Error Handling

Always handle error events:

```javascript
socket.on('message:error', (error) => {
  // Show user-friendly error message
  showNotification(error.error, 'error');
  
  // Rollback optimistic update if needed
  if (error.tempId) {
    removeMessageFromUI(error.tempId);
  }
});

socket.on('connect_error', (error) => {
  // Handle connection errors
  if (error.message === 'Authentication token required') {
    // Redirect to login
  }
});
```

### 5. Read Receipts

Send read receipts when user views messages:

```javascript
// When conversation is opened or scrolled to message
function markMessagesAsRead(messages) {
  messages.forEach(message => {
    if (message.from !== currentUserId && !message.status.read) {
      socket.emit('message:read', {
        messageId: message.id,
        senderId: message.from
      });
    }
  });
}
```

---

## Performance Tips

1. **Batch Operations**: Send multiple typing events using debouncing
2. **Connection Pooling**: Reuse socket connection across components
3. **Lazy Loading**: Load message history on demand via REST API
4. **Optimistic Updates**: Update UI immediately, rollback on error
5. **Selective Listening**: Only listen to events for active conversations

