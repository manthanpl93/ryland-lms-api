# Change 6: Handler - typingHandler

**Type:** Handler  
**Location:** `socket/handlers/typingHandler.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Handles typing indicator events, notifying recipients when a user starts or stops typing. Provides real-time feedback for better user experience in chat conversations.

## Affected Files

```
src/
└── socket/
    └── handlers/
        └── [+] typingHandler.js ──→ Typing indicator handling
```

**Legend:** [+] New

## Logic/Implementation

### Logical Block 1: Typing Start Handler

**What it does:**
When user starts typing, broadcasts typing indicator to recipient.

**Why added/changed:**
Provides real-time feedback that someone is composing a message.

**Implementation approach:**
```javascript
socket.on(TYPING.START, (data) => {
  const { recipientId } = data;
  
  // Notify recipient
  connectionManager.emitToUser(recipientId, TYPING.START, {
    userId: socket.user._id,
    timestamp: new Date()
  });
});
```

### Logical Block 2: Typing Stop Handler

**What it does:**
When user stops typing, removes typing indicator for recipient.

**Why added/changed:**
Cleans up typing indicator when user stops or sends message.

**Implementation approach:**
```javascript
socket.on(TYPING.STOP, (data) => {
  const { recipientId } = data;
  
  // Notify recipient
  connectionManager.emitToUser(recipientId, TYPING.STOP, {
    userId: socket.user._id,
    timestamp: new Date()
  });
});
```

## Code Changes

### In `socket/handlers/typingHandler.js`:

**Adding typing handler:**
```javascript
const { EVENT_GROUPS } = require('../constants/events');

const { TYPING } = EVENT_GROUPS;

/**
 * Typing indicator event handler
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Client socket
 * @param {ConnectionManager} connectionManager - Connection manager
 */
function typingHandler(io, socket, connectionManager) {
  
  /**
   * Handle typing:start event
   * User started typing
   */
  socket.on(TYPING.START, (data) => {
    try {
      const { recipientId } = data;
      
      if (!recipientId) {
        return;
      }
      
      console.log(`Typing started: ${socket.user._id} -> ${recipientId}`);
      
      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);
      
      if (recipientOnline) {
        // Notify recipient
        connectionManager.emitToUser(recipientId, TYPING.START, {
          userId: socket.user._id,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling typing:start:', error);
    }
  });
  
  /**
   * Handle typing:stop event
   * User stopped typing
   */
  socket.on(TYPING.STOP, (data) => {
    try {
      const { recipientId } = data;
      
      if (!recipientId) {
        return;
      }
      
      console.log(`Typing stopped: ${socket.user._id} -> ${recipientId}`);
      
      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);
      
      if (recipientOnline) {
        // Notify recipient
        connectionManager.emitToUser(recipientId, TYPING.STOP, {
          userId: socket.user._id,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error handling typing:stop:', error);
    }
  });
}

module.exports = typingHandler;
```

## Dependencies

- [+] `events.js` (Constants) - Event names
- [+] `connectionManager.js` (Function) - Route typing indicators

## Models & Types

```typescript
// Typing start payload
interface TypingStartPayload {
  recipientId: string;
}

// Typing stop payload
interface TypingStopPayload {
  recipientId: string;
}

// Typing indicator data
interface TypingIndicatorData {
  userId: string;
  timestamp: string;
}
```

## Error Codes

No specific errors - typing indicators are non-critical and fail silently.

---

[← Back to API Design Overview](../3-api-design.md)

