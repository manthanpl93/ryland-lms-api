# API Design

## Changes Overview

**File-based listing** (one section per file with link to detailed documentation):

### 1. `socket/socket.js` - **[+] Added**
**Type:** Handler  
**Purpose:** Socket.IO server initialization with class queries on connection  
**Key Functions:** `initializeSocketServer(app)`  
**Details:** [See detailed documentation →](./3-changes/1-socket-server-initialization.md)

### 2. `socket/auth.js` - **[+] Added**
**Type:** Middleware  
**Purpose:** JWT authentication middleware for socket connections  
**Key Functions:** `authenticateSocket(app)`  
**Details:** [See detailed documentation →](./3-changes/2-socket-authentication.md)

### 3. `socket/connectionManager.js` - **[+] Added**
**Type:** Service  
**Purpose:** Multi-index connection management with school/role/class filtering  
**Key Functions:**
- `addConnection(userId, socket, metadata)` - Add connection and update all indexes
- `removeConnection(userId, socketId)` - Remove connection and clean up indexes
- `getUserSockets(userId)` - Get all sockets for a user
- `isUserOnline(userId)` - Check if user has active connections
- `getOnlineUsersBySchool(schoolId)` - Get all online users in a school (O(1))
- `getOnlineUsersBySchoolAndRole(schoolId, role)` - Get online users by school + role (O(1))
- `getOnlineUsersByClass(classId)` - Get online users in a class (O(1))
- `getOnlineTeachersForClasses(classIds)` - Get teachers teaching any of the classes
- `getOnlineStudentsInClasses(classIds)` - Get students enrolled in any of the classes
- `getBroadcastTargetsForUser(userId)` - Get broadcast targets based on user role
- `emitToUser(userId, event, data)` - Emit to user with connection validation
- `getOnlineUserCount()` - Get total online user count
- `getOnlineUserIds()` - Get all online user IDs  
**Details:** [See detailed documentation →](./3-changes/3-connection-manager.md)

### 4. `socket/handlers/messageHandler.js` - **[+] Added**
**Type:** Handler  
**Purpose:** Handle message events with database integration  
**Key Functions:** `messageHandler(io, socket, connectionManager, app)`  
**Events Handled:**
- `message:send` - Send message with DB persistence
- `message:read` - Mark message as read
- `message:update` - Edit message content
- `message:delete` - Soft delete message  
**Details:** [See detailed documentation →](./3-changes/5-message-handler.md)

### 5. `socket/handlers/typingHandler.js` - **[+] Added**
**Type:** Handler  
**Purpose:** Handle typing indicator events  
**Key Functions:** `typingHandler(io, socket, connectionManager)`  
**Events Handled:**
- `typing:start` - User starts typing
- `typing:stop` - User stops typing  
**Details:** [See detailed documentation →](./3-changes/6-typing-handler.md)

### 6. `socket/helpers/conversationHelper.js` - **[+] Added**
**Type:** Util  
**Purpose:** Conversation lookup and creation utilities  
**Key Functions:** `findOrCreateConversation(app, senderId, recipientId)`  
**Details:** Helper function for conversation management (see Message Handler for usage)

### 7. `socket/constants/events.js` - **[+] Added**
**Type:** Type  
**Purpose:** Event constant definitions grouped by category  
**Exports:** `EVENT_GROUPS` (USER, MESSAGE, TYPING)  
**Details:** [See detailed documentation →](./3-changes/4-event-constants.md)

### 8. `types/socket.types.ts` - **[+] Added**
**Type:** Type  
**Purpose:** TypeScript interfaces for socket events and payloads  
**Exports:** All socket-related type definitions  
**Details:** [See detailed documentation →](./3-changes/7-socket-types.md)

### 9. `app.ts` - **[~] Modified**
**Type:** Integration  
**Purpose:** Initialize chat socket server with Feathers app  
**Changes:** Import and configure `initializeSocketServer()`  
**Details:** [See detailed documentation →](./3-changes/8-app-integration.md)

### 10. `models/conversations.model.ts` - **[+] Added**
**Type:** Model  
**Purpose:** Database model for conversation threads between users  
**Key Fields:** `participants`, `lastMessage`, `lastMessageAt`, `unreadCount`  
**Details:** See `5-models.md` for complete schema and validation

### 11. `models/messages.model.ts` - **[+] Added**
**Type:** Model  
**Purpose:** Database model for individual chat messages  
**Key Fields:** `conversationId`, `senderId`, `recipientId`, `content`, `status`, `isEdited`, `isDeleted`  
**Details:** See `5-models.md` for complete schema and validation

### 12. `services/conversations/conversations.service.ts` - **[+] Added**
**Type:** Service  
**Purpose:** Feathers service for conversation CRUD operations  
**Key Methods:** `find()`, `get()`, `create()`, `patch()`, `remove()`  
**Details:** [See detailed documentation →](./3-changes/9-conversations-service.md)

### 13. `services/messages/messages.service.ts` - **[+] Added**
**Type:** Service  
**Purpose:** Feathers service for message CRUD operations  
**Key Methods:** `find()`, `get()`, `create()`, `patch()`, `remove()`  
**Details:** [See detailed documentation →](./3-changes/10-messages-service.md)

---

## Type Categories

- **Handler** - Socket event handlers and server initialization
- **Middleware** - Socket.IO middleware functions
- **Service** - Feathers services and business logic
- **Model** - Database models and schemas
- **Util** - Helper functions and utilities
- **Type** - TypeScript type definitions and constants
- **Integration** - App-level configuration and setup

## Status Legend

- **[+] Added** - New file created
- **[~] Modified** - Existing file updated
- **[-] Deleted** - File removed

---

## Navigation

### Core Infrastructure
- [Change 1: Socket Server Initialization](./3-changes/1-socket-server-initialization.md) - Main Socket.IO server setup
- [Change 2: Socket Authentication](./3-changes/2-socket-authentication.md) - JWT authentication middleware
- [Change 3: Connection Manager](./3-changes/3-connection-manager.md) - User connection tracking and management

### Database Layer
- [Database Models](./5-models.md) - Conversations and Messages schemas
  - Conversations Model - Track conversation threads between users
  - Messages Model - Store chat messages with status tracking

### Feathers Services
- [Change 9: Conversations Service](./3-changes/9-conversations-service.md) - RESTful API for conversation management
- [Change 10: Messages Service](./3-changes/10-messages-service.md) - RESTful API for message operations

### Event Handlers
- [Change 5: Message Handler](./3-changes/5-message-handler.md) - Message send/receive/update/delete events
- [Change 6: Typing Handler](./3-changes/6-typing-handler.md) - Typing indicator events

### Types & Constants
- [Change 4: Event Constants](./3-changes/4-event-constants.md) - Socket event name definitions
- [Change 7: Socket Types](./3-changes/7-socket-types.md) - TypeScript type definitions

### Integration
- [Change 8: App Integration](./3-changes/8-app-integration.md) - Feathers app configuration

---

## Implementation Order

For implementation, follow this recommended order:

1. **Types & Constants** - Start with type definitions and event constants
2. **Database Models** - Create Conversations and Messages models
3. **Feathers Services** - Implement Conversations and Messages services
4. **Connection Manager** - Build the connection tracking system
5. **Authentication** - Add socket authentication middleware
6. **Socket Server** - Initialize the Socket.IO server
7. **Event Handlers** - Implement message and typing handlers
8. **App Integration** - Connect everything to the Feathers app

---

## Quick Reference

### Key Files by Purpose

**Authentication:**
- `socket/auth.js` - JWT verification for socket connections

**Connection Management:**
- `socket/connectionManager.js` - Track online users and their sockets

**Event Handling:**
- `socket/handlers/messageHandler.js` - Message operations
- `socket/handlers/typingHandler.js` - Typing indicators

**Database Models:**
- `models/conversations.model.ts` - Conversation thread schema (see `5-models.md`)
- `models/messages.model.ts` - Message storage schema (see `5-models.md`)

**Feathers Services:**
- `services/conversations/conversations.service.ts` - Conversation CRUD API
- `services/messages/messages.service.ts` - Message CRUD API

**Helpers & Utilities:**
- `socket/helpers/conversationHelper.js` - Conversation lookup/creation utilities

**Configuration:**
- `socket/constants/events.js` - Event name constants
- `types/socket.types.ts` - TypeScript interfaces

**Integration:**
- `socket/socket.js` - Server initialization
- `app.ts` - App-level setup
