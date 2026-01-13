# Socket Event Handlers

This directory contains all socket event handlers for the chat application.

## Architecture

### Registration Point: `src/app.ts`

**IMPORTANT:** All socket event handlers MUST be registered in `src/app.ts`, not in `chatSocket.js`.

The socket connection lifecycle is managed in `src/app.ts` where the actual Socket.IO server connects to clients. Handlers registered elsewhere will not receive events.

### Correct Handler Registration

```typescript
// src/app.ts
import messageHandler from "./socket/handlers/messageHandler";
import typingHandler from "./socket/handlers/typingHandler";
import reactionHandler from "./socket/handlers/reactionHandler";

// Inside socket connection handler
io.on("connection", async (socket) => {
  // ... authentication ...
  
  // Register ALL handlers here
  messageHandler(io, socket, connectionManager);
  typingHandler(io, socket, connectionManager);
  reactionHandler(io, socket, connectionManager);
});
```

## Available Handlers

### 1. messageHandler.js
Handles all message-related events:
- `message:send` - Send new message
- `message:reply` - Reply to message
- `message:read` - Mark messages as read
- `message:update` - Edit message
- `message:delete` - Delete message

### 2. typingHandler.js
Handles typing indicator events:
- `typing:start` - User starts typing
- `typing:stop` - User stops typing

### 3. reactionHandler.js
Handles message reaction events:
- `reaction:add` - Add/change/toggle reaction
- `reaction:remove` - Remove reaction

## Handler Structure

Each handler follows this pattern:

```javascript
function handlerName(io, socket, connectionManager) {
  // Register event listeners
  socket.on('event:name', async (data) => {
    try {
      // 1. Validate input
      // 2. Check permissions
      // 3. Process request (update database)
      // 4. Broadcast to participants
      // 5. Confirm to sender
    } catch (error) {
      // Handle errors
      socket.emit('event:error', { error: error.message });
    }
  });
}

module.exports = handlerName;
```

## Adding a New Handler

1. **Create handler file** in this directory (e.g., `newFeatureHandler.js`)

2. **Implement handler function**:
   ```javascript
   function newFeatureHandler(io, socket, connectionManager) {
     socket.on('feature:action', async (data) => {
       // Implementation
     });
   }
   
   module.exports = newFeatureHandler;
   ```

3. **Register in `src/app.ts`** (CRITICAL STEP):
   ```typescript
   import newFeatureHandler from "./socket/handlers/newFeatureHandler";
   
   // In socket connection handler
   io.on("connection", async (socket) => {
     // ... other handlers ...
     newFeatureHandler(io, socket, connectionManager);
   });
   ```

4. **Update event constants** in `src/socket/constants/events.js`:
   ```javascript
   FEATURE: {
     ACTION: "feature:action",
     ERROR: "feature:error"
   }
   ```

5. **Document events** in `docs/chat-application/socket-events.md`

## Testing Handlers

### Backend Logs
Add comprehensive logging to verify handler execution:

```javascript
socket.on('event:name', async (data) => {
  console.log('🎯 EVENT RECEIVED:', data);
  
  try {
    // Process...
    console.log('✅ EVENT PROCESSED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ EVENT ERROR:', error);
  }
});
```

### Verification Checklist

- [ ] Handler imported in `src/app.ts`
- [ ] Handler registered in socket connection callback
- [ ] Event constants defined
- [ ] Backend logs appear when event is received
- [ ] Client receives response events
- [ ] Error handling implemented
- [ ] Documentation updated

## Common Issues

### Issue: Events Not Received
**Symptom:** Frontend emits event but backend handler never called

**Solution:** Verify handler is registered in `src/app.ts`, not just `chatSocket.js`

### Issue: Multiple Event Handlers
**Symptom:** Event processed multiple times

**Solution:** Ensure handler is only registered once per connection

### Issue: Connection Manager Not Available
**Symptom:** `connectionManager.emitToUser()` fails

**Solution:** Ensure `connectionManager` is passed to handler from `app.ts`

## Best Practices

1. **Always validate input** before processing
2. **Check user permissions** before modifying data
3. **Persist to database** before broadcasting
4. **Broadcast to all participants** including sender
5. **Send error events** for failures
6. **Log important events** for debugging
7. **Use transactions** for multi-step operations
8. **Clean up on disconnect** if needed

## Connection Manager

The `connectionManager` provides these methods:

- `addConnection(userId, socket, metadata)` - Add socket connection
- `removeConnection(userId, socketId)` - Remove socket connection
- `getUserSockets(userId)` - Get all sockets for user
- `emitToUser(userId, event, data)` - Emit to all user's sockets
- `isUserOnline(userId)` - Check if user is online
- `getBroadcastTargetsForUser(userId)` - Get users who should receive broadcasts

## Event Naming Convention

- Format: `feature:action`
- Examples:
  - `message:send`
  - `typing:start`
  - `reaction:add`
  - `user:online`

## Error Events

All handlers should emit error events with this format:

```javascript
socket.emit('feature:error', {
  error: 'Human-readable error message',
  code: 'ERROR_CODE',
  details: additionalInfo
});
```

---

**Last Updated:** January 2026
**Maintained By:** Development Team
