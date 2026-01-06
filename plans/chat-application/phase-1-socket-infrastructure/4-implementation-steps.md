# Implementation Steps

## 1. Setup (Est: 1 hr)

- [ ] Create `socket/` directory structure in `ryland-lms-api/src/`
- [ ] Create `socket/constants/` directory
- [ ] Create `socket/handlers/` directory
- [ ] Create `socket/helpers/` directory
- [ ] Install dependencies: `npm install uuid` (for message IDs)
- [ ] Create branch: `feature/chat-phase-1-socket-infrastructure`

## 2. Database Models (Est: 3 hrs)

### Conversations Model
- [ ] Create `src/models/conversations.model.ts`
- [ ] Import Application, Model, Mongoose types
- [ ] Define conversations schema with:
  - [ ] participants array (2 ObjectIds, ref: 'users')
  - [ ] lastMessage object (content, senderId, timestamp)
  - [ ] lastMessageAt Date field
  - [ ] unreadCount Map field
  - [ ] isActive Boolean field
- [ ] Add schema options: timestamps, toJSON, toObject virtuals
- [ ] Create indexes:
  - [ ] { participants: 1 }
  - [ ] { lastMessageAt: -1 }
  - [ ] { participants: 1 } unique
- [ ] Add pre-save validation for exactly 2 participants
- [ ] Add getOtherParticipant() method
- [ ] Add messages virtual reference
- [ ] Export model function

### Messages Model
- [ ] Create `src/models/messages.model.ts`
- [ ] Import Application, Model, Mongoose types
- [ ] Define messages schema with:
  - [ ] conversationId ObjectId (ref: 'conversations')
  - [ ] senderId ObjectId (ref: 'users')
  - [ ] recipientId ObjectId (ref: 'users')
  - [ ] content String
  - [ ] status object (delivered, deliveredAt, read, readAt)
  - [ ] isEdited, editedAt, originalContent fields
  - [ ] isDeleted, deletedAt, deletedBy fields
- [ ] Add schema options: timestamps, toJSON, toObject virtuals
- [ ] Create indexes:
  - [ ] { conversationId: 1, createdAt: -1 }
  - [ ] { senderId: 1, recipientId: 1, createdAt: -1 }
  - [ ] { conversationId: 1, isDeleted: 1 }
- [ ] Add sender and recipient virtuals
- [ ] Export model function

## 3. Conversations Service (Est: 3 hrs)

- [ ] Create `src/services/conversations/` directory
- [ ] Create `conversations.service.ts`:
  - [ ] Import required types and model
  - [ ] Define ServiceTypes interface extension
  - [ ] Export service registration function
  - [ ] Configure service with model and pagination
- [ ] Create `conversations.class.ts`:
  - [ ] Extend feathers-mongoose Service
  - [ ] Implement find() - filter by participant
  - [ ] Implement get() - verify participant access
  - [ ] Implement create() - handle duplicates, sort participants
  - [ ] Implement patch() - verify participant access
  - [ ] Add updateLastMessage() helper
  - [ ] Add incrementUnreadCount() helper
  - [ ] Add resetUnreadCount() helper
- [ ] Create `conversations.hooks.ts`:
  - [ ] Add authenticate JWT to all methods
  - [ ] Add populate participants in after find/get
- [ ] Create `conversations.types.ts`:
  - [ ] Define ConversationData interface
  - [ ] Define CreateConversationDto interface
  - [ ] Define UpdateConversationDto interface

## 4. Messages Service (Est: 3 hrs)

- [ ] Create `src/services/messages/` directory
- [ ] Create `messages.service.ts`:
  - [ ] Import required types and model
  - [ ] Define ServiceTypes interface extension
  - [ ] Export service registration function
  - [ ] Configure service with model and pagination
- [ ] Create `messages.class.ts`:
  - [ ] Extend feathers-mongoose Service
  - [ ] Implement find() - require conversationId, verify access
  - [ ] Implement get() - verify sender/recipient access
  - [ ] Implement create() - save message, update conversation
  - [ ] Implement patch() - handle read/edit operations
  - [ ] Implement remove() - soft delete only by sender
- [ ] Create `messages.hooks.ts`:
  - [ ] Add authenticate JWT to all methods
  - [ ] Add populate sender/recipient in after find
- [ ] Create `messages.types.ts`:
  - [ ] Define MessageData interface
  - [ ] Define CreateMessageDto interface
  - [ ] Define UpdateMessageDto interface

## 5. Service Registration (Est: 30 min)

- [ ] Open `src/services/index.ts`
- [ ] Import conversations service
- [ ] Import messages service
- [ ] Add app.configure(conversations)
- [ ] Add app.configure(messages)

## 6. Event Constants (Est: 1 hr)

- [ ] Create `socket/constants/events.js`
- [ ] Define `EVENT_GROUPS` object with USER, MESSAGE, TYPING groups
- [ ] Define `CLIENT_TO_SERVER` event array
- [ ] Define `SERVER_TO_CLIENT` event array
- [ ] Export all constants

## 7. Connection Manager (Est: 2 hrs)

- [ ] Create `socket/connectionManager.js`
- [ ] Implement `ConnectionManager` class with Map for user-socket mapping
- [ ] Implement `addConnection(userId, socket)` method
- [ ] Implement `removeConnection(userId, socketId)` method
- [ ] Implement `getUserSockets(userId)` method
- [ ] Implement `isUserOnline(userId)` method
- [ ] Implement `getOnlineUserCount()` method
- [ ] Implement `getOnlineUserIds()` method
- [ ] Implement `emitToUser(userId, event, data)` method
- [ ] Export singleton instance
- [ ] Add console logging for debugging

## 8. Authentication Middleware (Est: 2 hrs)

- [ ] Create `socket/auth.js`
- [ ] Implement `authenticateSocket(app)` middleware function
- [ ] Extract token from `socket.handshake.query.token` or `socket.handshake.auth.token`
- [ ] Verify token using `app.service('authentication').verifyAccessToken()`
- [ ] Fetch user from database using `app.service('users').get()`
- [ ] Attach user object to `socket.user`
- [ ] Handle authentication errors with descriptive messages
- [ ] Add console logging for auth attempts
- [ ] Export middleware function

## 9. Socket Helpers (Est: 2 hrs)

- [ ] Create `socket/helpers/conversationHelper.js`
- [ ] Implement `findOrCreateConversation(app, senderId, recipientId)`:
  - [ ] Try to find existing conversation
  - [ ] If not found, create new conversation
  - [ ] Return conversation object
- [ ] Add error handling and logging
- [ ] Export helper functions

## 10. Message Handler with Database (Est: 4 hrs)

- [ ] Create `socket/handlers/messageHandler.js`
- [ ] Import event constants, conversation helper, app reference
- [ ] Implement `messageHandler(io, socket, connectionManager, app)` function
- [ ] Handle `message:send` event:
  - [ ] Validate required fields (recipientId, content)
  - [ ] Call `findOrCreateConversation()` helper
  - [ ] Create message via `app.service('messages').create()`
  - [ ] Message service auto-updates conversation metadata
  - [ ] Check if recipient is online
  - [ ] Emit to recipient sockets using `connectionManager.emitToUser()`
  - [ ] Send delivery confirmation to sender with DB message ID
  - [ ] Handle errors and emit `message:error`
- [ ] Handle `message:read` event:
  - [ ] Validate messageId and senderId
  - [ ] Update message in DB via `app.service('messages').patch()`
  - [ ] Service auto-resets unread count
  - [ ] Notify sender with read receipt
- [ ] Handle `message:update` event:
  - [ ] Validate messageId, content, recipientId
  - [ ] Update message in DB via `app.service('messages').patch()`
  - [ ] Broadcast update to recipient
  - [ ] Confirm to sender
- [ ] Handle `message:delete` event:
  - [ ] Validate messageId, recipientId
  - [ ] Soft delete in DB via `app.service('messages').remove()`
  - [ ] Broadcast deletion to recipient
  - [ ] Confirm to sender
- [ ] Add console logging for all operations
- [ ] Export handler function

## 11. Typing Handler (Est: 1 hr)

- [ ] Create `socket/handlers/typingHandler.js`
- [ ] Import event constants
- [ ] Implement `typingHandler(io, socket, connectionManager)` function
- [ ] Handle `typing:start` event:
  - [ ] Validate recipientId
  - [ ] Check if recipient is online
  - [ ] Notify recipient using `connectionManager.emitToUser()`
- [ ] Handle `typing:stop` event:
  - [ ] Validate recipientId
  - [ ] Check if recipient is online
  - [ ] Notify recipient
- [ ] Add console logging
- [ ] Export handler function

## 12. Socket Server (Est: 2 hrs)

- [ ] Create `socket/socket.js`
- [ ] Import Socket.IO Server, auth middleware, handlers, connection manager
- [ ] Implement `initializeSocketServer(app)` function
- [ ] Get HTTP server from app: `app.get('server')`
- [ ] Create Socket.IO server with configuration:
  - [ ] CORS settings from environment
  - [ ] `maxHttpBufferSize: 1e8` (100MB)
  - [ ] Transports: websocket, polling
- [ ] Apply authentication middleware: `io.use(authenticateSocket(app))`
- [ ] Handle `connection` event:
  - [ ] Extract authenticated user from `socket.user`
  - [ ] Add connection using `connectionManager.addConnection()`
  - [ ] Broadcast `user:online` if first connection
  - [ ] Register message handler (pass app reference)
  - [ ] Register typing handler
- [ ] Handle `disconnect` event:
  - [ ] Remove connection using `connectionManager.removeConnection()`
  - [ ] Broadcast `user:offline` if last connection
- [ ] Add console logging for connections/disconnections
- [ ] Export initialization function

## 13. App Integration (Est: 1 hr)

- [ ] Open `src/app.ts`
- [ ] Import `initializeSocketServer` from `./socket/socket`
- [ ] After existing socket.io configuration, call `initializeSocketServer(app)`
- [ ] Store socket instance: `app.set('chatIo', chatIo)`
- [ ] Add console logging

## 14. TypeScript Types (Est: 1 hr)

- [ ] Create `src/types/socket.types.ts`
- [ ] Define `AuthenticatedSocket` interface
- [ ] Define `MessageSendPayload` interface
- [ ] Define `Message` interface
- [ ] Define `MessageDeliveredPayload` interface
- [ ] Define `MessageReadPayload` and `MessageReadConfirmation` interfaces
- [ ] Define `MessageUpdatePayload` and `MessageDeletePayload` interfaces
- [ ] Define `MessageErrorPayload` interface
- [ ] Define `TypingStartPayload`, `TypingStopPayload`, `TypingIndicatorData` interfaces
- [ ] Define `UserOnlinePayload` and `UserOfflinePayload` interfaces
- [ ] Define `IConnectionManager` interface
- [ ] Export all types

## 15. Documentation (Est: 2 hrs)

- [ ] Create `docs/chat/socket-events.md` documenting all events
- [ ] Document client-to-server events with payload examples
- [ ] Document server-to-client events with payload examples
- [ ] Document authentication flow
- [ ] Document connection manager usage
- [ ] Add example code for client connection
- [ ] Add example code for sending messages
- [ ] Add example code for typing indicators
- [ ] Document error handling patterns

## 16. Code Review (Est: 1 hr)

- [ ] Review all socket code for consistency
- [ ] Review all database models and services
- [ ] Verify error handling in all handlers and services
- [ ] Check console logging is informative
- [ ] Verify TypeScript types are complete
- [ ] Check code follows project conventions (Feathers patterns)
- [ ] Verify no sensitive data logged
- [ ] Check performance considerations
- [ ] Review security: JWT validation, input sanitization, authorization
- [ ] Verify database indexes are optimal
- [ ] Check transaction handling if needed

## Total Estimated Time: ~26 hours

### Breakdown by Category:
- **Setup & Structure:** 1 hr
- **Database Models:** 3 hrs
- **Feathers Services:** 6.5 hrs
- **Socket Implementation:** 11 hrs
- **Documentation:** 2 hrs
- **Review:** 1 hr
- **Buffer:** 1.5 hrs

