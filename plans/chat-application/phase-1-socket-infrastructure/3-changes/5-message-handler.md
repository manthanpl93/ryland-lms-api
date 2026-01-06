# Change 5: Handler - messageHandler

**Type:** Handler  
**Location:** `socket/handlers/messageHandler.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## ⚠️ CRITICAL: Database Integration Required

**This handler MUST integrate with the Messages Service (Change 10) for database persistence.**

Without database integration:
- ❌ Offline users won't receive messages
- ❌ Message history won't be stored
- ❌ Read receipts won't persist
- ❌ No message recovery or audit trail

All socket event handlers in this file now include database operations via `io.app.service('messages')` to ensure messages are persisted before being broadcast to connected users.

---

## Changes Summary

Handles all message-related socket events including sending, delivery confirmation, read receipts, updates, and deletions. **Persists all message operations to database via Messages Service**, then routes real-time updates between connected users using the connection manager. Ensures offline users can retrieve messages when they reconnect.

## Affected Files

```
src/
└── socket/
    └── handlers/
        └── [+] messageHandler.js ──→ Message event handling
```

**Legend:** [+] New

## Logic/Implementation

### Logical Block 1: Message Send Handler

**What it does:**
Receives message from sender, **persists to database via Messages Service**, generates message ID and timestamp, sends to recipient's sockets, and confirms delivery to sender.

**Why added/changed:**
Core functionality for 1-on-1 messaging with database persistence for offline delivery and message history.

**Implementation approach:**
```javascript
socket.on(MESSAGE.SEND, async (data) => {
  // ✅ PERSIST TO DATABASE first
  const savedMessage = await io.app.service('messages').create({
    conversationId: data.conversationId,
    recipientId: data.recipientId,
    content: data.content.trim()
  }, { user: socket.user });
  
  // Create socket message from saved data
  const message = {
    id: savedMessage._id.toString(),
    tempId: data.tempId,
    from: socket.user._id,
    to: data.recipientId,
    content: savedMessage.content,
    timestamp: savedMessage.createdAt,
    status: 'sent'
  };
  
  // Send to recipient's sockets if online
  if (connectionManager.isUserOnline(data.recipientId)) {
    connectionManager.emitToUser(data.recipientId, MESSAGE.RECEIVE, message);
    // Mark as delivered in DB
    await io.app.service('messages').patch(savedMessage._id, { markAsDelivered: true });
  }
  
  // Confirm to sender
  socket.emit(MESSAGE.DELIVERED, { messageId: message.id, tempId: data.tempId });
});
```

### Logical Block 2: Message Read Handler

**What it does:**
When recipient reads a message, **persists read status to database**, then notifies the sender via socket that message was read.

**Why added/changed:**
Provides read receipts for better UX (like WhatsApp blue ticks) with persistent storage for status tracking.

**Implementation approach:**
```javascript
socket.on(MESSAGE.READ, async (data) => {
  const { messageId, senderId } = data;
  
  // ✅ PERSIST TO DATABASE - Mark as read
  await io.app.service('messages').patch(messageId, {
    markAsRead: true
  }, { user: socket.user });
  
  // Notify sender via socket
  connectionManager.emitToUser(senderId, MESSAGE.READ, {
    messageId,
    readBy: socket.user._id,
    readAt: new Date()
  });
});
```

### Logical Block 3: Message Update/Delete Handler

**What it does:**
Allows users to edit or delete sent messages, **persists changes to database**, and broadcasts changes to recipient via socket.

**Why added/changed:**
Common messaging feature for correcting mistakes or removing messages with permanent record of changes.

**Implementation approach:**
```javascript
socket.on(MESSAGE.UPDATE, async (data) => {
  const { messageId, content, recipientId } = data;
  
  // ✅ PERSIST TO DATABASE - Update message
  const updatedMessage = await io.app.service('messages').patch(messageId, {
    content: content.trim()
  }, { user: socket.user });
  
  // Broadcast update to recipient via socket
  connectionManager.emitToUser(recipientId, MESSAGE.UPDATE, {
    messageId,
    content: updatedMessage.content,
    updatedAt: updatedMessage.editedAt,
    isEdited: updatedMessage.isEdited
  });
});

socket.on(MESSAGE.DELETE, async (data) => {
  const { messageId, recipientId } = data;
  
  // ✅ PERSIST TO DATABASE - Soft delete
  await io.app.service('messages').remove(messageId, { user: socket.user });
  
  // Broadcast deletion to recipient
  connectionManager.emitToUser(recipientId, MESSAGE.DELETE, {
    messageId,
    deletedAt: new Date()
  });
});
```

## Code Changes

### In `socket/handlers/messageHandler.js`:

**Adding message handler:**
```javascript
const { EVENT_GROUPS } = require('../constants/events');
const { v4: uuidv4 } = require('uuid');

const { MESSAGE } = EVENT_GROUPS;

/**
 * Message event handler
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Client socket
 * @param {ConnectionManager} connectionManager - Connection manager
 */
function messageHandler(io, socket, connectionManager) {
  
  /**
   * Handle message:send event
   * Client sends a new message
   */
  socket.on(MESSAGE.SEND, async (data) => {
    try {
      const { recipientId, content, tempId, conversationId } = data;
      
      // Validate input
      if (!recipientId || !content || !conversationId) {
        socket.emit(MESSAGE.ERROR, {
          error: 'Missing required fields',
          tempId
        });
        return;
      }
      
      // Check if recipient exists/online
      const recipientOnline = connectionManager.isUserOnline(recipientId);
      
      // ✅ PERSIST TO DATABASE using Messages Service
      const savedMessage = await io.app.service('messages').create({
        conversationId,
        recipientId,
        content: content.trim()
      }, {
        user: socket.user // Pass authenticated user context
      });
      
      // Create socket message object from saved message
      const message = {
        id: savedMessage._id.toString(),
        tempId, // Client's temporary ID for optimistic updates
        from: socket.user._id,
        to: recipientId,
        content: savedMessage.content,
        timestamp: savedMessage.createdAt,
        status: 'sent',
        conversationId: savedMessage.conversationId
      };
      
      console.log(`Message sent: ${socket.user._id} -> ${recipientId} (DB ID: ${message.id})`);
      
      // Send to recipient if online
      if (recipientOnline) {
        connectionManager.emitToUser(recipientId, MESSAGE.RECEIVE, message);
        
        // Mark as delivered in database if recipient is online
        await io.app.service('messages').patch(savedMessage._id, {
          markAsDelivered: true
        });
      }
      
      // Confirm delivery to sender
      socket.emit(MESSAGE.DELIVERED, {
        messageId: message.id,
        tempId: message.tempId,
        timestamp: message.timestamp,
        recipientOnline
      });
      
    } catch (error) {
      console.error('Error handling message:send:', error);
      socket.emit(MESSAGE.ERROR, {
        error: 'Failed to send message',
        tempId: data.tempId
      });
    }
  });
  
  /**
   * Handle message:read event
   * Client marks message as read
   */
  socket.on(MESSAGE.READ, async (data) => {
    try {
      const { messageId, senderId } = data;
      
      if (!messageId || !senderId) {
        return;
      }
      
      console.log(`Message read: ${messageId} by ${socket.user._id}`);
      
      // ✅ PERSIST TO DATABASE - Mark message as read
      await io.app.service('messages').patch(messageId, {
        markAsRead: true
      }, {
        user: socket.user
      });
      
      const readData = {
        messageId,
        readBy: socket.user._id,
        readAt: new Date().toISOString()
      };
      
      // Notify sender via socket
      connectionManager.emitToUser(senderId, MESSAGE.READ, readData);
      
    } catch (error) {
      console.error('Error handling message:read:', error);
    }
  });
  
  /**
   * Handle message:update event
   * Client updates existing message
   */
  socket.on(MESSAGE.UPDATE, async (data) => {
    try {
      const { messageId, content, recipientId } = data;
      
      if (!messageId || !content || !recipientId) {
        socket.emit(MESSAGE.ERROR, {
          error: 'Missing required fields',
          messageId
        });
        return;
      }
      
      console.log(`Message updated: ${messageId}`);
      
      // ✅ PERSIST TO DATABASE - Update message content
      const updatedMessage = await io.app.service('messages').patch(messageId, {
        content: content.trim()
      }, {
        user: socket.user
      });
      
      const updateData = {
        messageId,
        content: updatedMessage.content,
        updatedAt: updatedMessage.editedAt || new Date().toISOString(),
        updatedBy: socket.user._id,
        isEdited: updatedMessage.isEdited
      };
      
      // Broadcast to recipient via socket
      connectionManager.emitToUser(recipientId, MESSAGE.UPDATE, updateData);
      
      // Confirm to sender
      socket.emit(MESSAGE.UPDATE, updateData);
      
    } catch (error) {
      console.error('Error handling message:update:', error);
      socket.emit(MESSAGE.ERROR, {
        error: 'Failed to update message',
        messageId: data.messageId
      });
    }
  });
  
  /**
   * Handle message:delete event
   * Client deletes message
   */
  socket.on(MESSAGE.DELETE, async (data) => {
    try {
      const { messageId, recipientId } = data;
      
      if (!messageId || !recipientId) {
        socket.emit(MESSAGE.ERROR, {
          error: 'Missing required fields',
          messageId
        });
        return;
      }
      
      console.log(`Message deleted: ${messageId}`);
      
      // ✅ PERSIST TO DATABASE - Soft delete message
      const deletedMessage = await io.app.service('messages').remove(messageId, {
        user: socket.user
      });
      
      const deleteData = {
        messageId,
        deletedAt: deletedMessage.deletedAt || new Date().toISOString(),
        deletedBy: socket.user._id
      };
      
      // Broadcast to recipient via socket
      connectionManager.emitToUser(recipientId, MESSAGE.DELETE, deleteData);
      
      // Confirm to sender
      socket.emit(MESSAGE.DELETE, deleteData);
      
    } catch (error) {
      console.error('Error handling message:delete:', error);
      socket.emit(MESSAGE.ERROR, {
        error: 'Failed to delete message',
        messageId: data.messageId
      });
    }
  });
}

module.exports = messageHandler;
```

## Dependencies

- [+] `uuid` (Package) - ~~Generate unique message IDs~~ (Now handled by MongoDB _id)
- [+] `events.js` (Constants) - Event names
- [+] `connectionManager.js` (Function) - Route messages to online users
- [+] **`messages` Service** - **Persist messages, read receipts, updates, and deletions to database**
- [+] **`conversations` Service** - **Auto-updated by messages service (lastMessage, unreadCount)**

## Models & Types

```typescript
// Message send payload
interface MessageSendPayload {
  conversationId: string; // ✅ REQUIRED for database persistence
  recipientId: string;
  content: string;
  tempId?: string; // Client-side temporary ID
}

// Message object
interface Message {
  id: string;
  tempId?: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

// Message delivered confirmation
interface MessageDeliveredPayload {
  messageId: string;
  tempId?: string;
  timestamp: string;
  recipientOnline: boolean;
}

// Message read payload
interface MessageReadPayload {
  messageId: string;
  senderId: string;
}

// Message read confirmation
interface MessageReadConfirmation {
  messageId: string;
  readBy: string;
  readAt: string;
}

// Message update payload
interface MessageUpdatePayload {
  messageId: string;
  content: string;
  recipientId: string;
}

// Message delete payload
interface MessageDeletePayload {
  messageId: string;
  recipientId: string;
}

// Message error payload
interface MessageErrorPayload {
  error: string;
  messageId?: string;
  tempId?: string;
}
```

## Error Codes

**Common Errors:**
- **400 BadRequest:** `'Missing required fields'` - Invalid payload
- **404 NotFound:** `'Recipient not found'` - Invalid recipient ID
- **500 GeneralError:** `'Failed to send message'` - Generic error

**Usage:**
```javascript
socket.emit(MESSAGE.ERROR, {
  error: 'Missing required fields',
  tempId: data.tempId
});
```

---

[← Back to API Design Overview](../3-api-design.md)

