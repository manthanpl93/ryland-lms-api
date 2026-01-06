# Phase 1: Socket Infrastructure + Database

## Summary

Phase 1 establishes a complete chat backend for Ryland LMS, combining real-time WebSocket communication with persistent MongoDB storage. This phase delivers a production-ready 1-on-1 messaging system with JWT-based authentication, comprehensive event handling, database persistence, and REST APIs.

The implementation includes:
- **WebSocket Server**: Real-time message delivery, typing indicators, and user presence tracking (online/offline)
- **Database Models**: MongoDB schemas for conversations and messages with extended status tracking
- **Feathers Services**: RESTful APIs for conversation management and message history retrieval
- **Hybrid Architecture**: Socket events for real-time delivery + database persistence for message history

The socket infrastructure integrates with existing authentication (JWT tokens) and supports multiple concurrent connections per user (mobile + web). Messages are immediately saved to MongoDB and simultaneously broadcast via WebSockets, ensuring both real-time delivery and persistent storage.

This hybrid approach provides the best of both worlds: instant messaging experience for online users and reliable message history for offline users who reconnect later.

## Context

Ryland LMS already has:
- **Existing Socket.IO Infrastructure**: Used for AI quiz generation with authentication middleware
- **JWT Authentication**: Token-based auth system that can be reused for socket connections
- **Socket Management**: Basic socket holder patterns in `app.ts` with `setSocketById` and `addSocketToUser` functions

This chat feature will extend the existing socket infrastructure with dedicated chat-specific handlers and events while maintaining consistency with the current architecture.

## Deliverables

### Database Layer

1. **Conversations Model** (`models/conversations.model.ts`)
   - MongoDB schema for conversation threads
   - Participant tracking (2 users)
   - Last message metadata
   - Unread count per user
   - Timestamps and indexes

2. **Messages Model** (`models/messages.model.ts`)
   - MongoDB schema for chat messages
   - Extended status tracking (delivered, read)
   - Edit and delete tracking
   - Soft delete support
   - Sender/recipient references

### Service Layer

3. **Conversations Service** (`services/conversations/`)
   - REST API endpoints for conversations
   - Find user's conversations (paginated)
   - Create new conversation
   - Update conversation metadata
   - Helper methods for unread counts

4. **Messages Service** (`services/messages/`)
   - REST API endpoints for messages
   - Find messages in conversation (paginated)
   - Create new message
   - Update message (edit/read status)
   - Soft delete message

### Socket Layer

5. **Socket Server Module** (`socket/socket.js`)
   - Socket.IO server initialization
   - Configuration and middleware setup
   - Connection lifecycle management

6. **Authentication Middleware** (`socket/auth.js`)
   - JWT token verification for socket connections
   - User extraction from tokens
   - Authentication error handling

7. **Event Constants** (`socket/constants/events.js`)
   - Grouped event definitions (user, message, typing)
   - Event naming conventions
   - Client-to-server and server-to-client event mappings

8. **Message Handler** (`socket/handlers/messageHandler.js`)
   - Message send handling with database persistence
   - Message delivery confirmation
   - Message read receipts (updates database)
   - Message update/delete operations (updates database)

9. **Typing Handler** (`socket/handlers/typingHandler.js`)
   - Typing start/stop indicators
   - Typing state management
   - Recipient notification

10. **Connection Manager** (`socket/connectionManager.js`)
    - Multi-index structure for O(1) lookups (userId, schoolId, schoolId+role, classId)
    - User metadata storage (userRole, schoolId, classIds)
    - Multiple connection handling per user
    - Connection cleanup on disconnect with index management
    - School-aware and role-based user presence tracking
    - Query methods for filtering online users by school/role/class

11. **Socket Helpers** (`socket/helpers/conversationHelper.js`)
    - Find or create conversation helper
    - Conversation lookup utilities

## Tasks

### Database & Services
- [ ] Create conversations model with schema and indexes
- [ ] Create messages model with schema and indexes
- [ ] Implement conversations Feathers service (class, hooks, types)
- [ ] Implement messages Feathers service (class, hooks, types)
- [ ] Register services in services/index.ts

### Socket Infrastructure
- [ ] Create socket folder structure in backend API
- [ ] Set up Socket.IO server in `socket/socket.js`
- [ ] Implement JWT authentication middleware in `socket/auth.js`
- [ ] Define event constants in `socket/constants/events.js`
- [ ] Create connection manager with multi-index structure (userId, schoolId, schoolId+role, classId)
- [ ] Implement optimized query methods using secondary indexes
- [ ] Query user's classes on connection (class-teachers or class-enrollments)
- [ ] Store user metadata in connection manager (userRole, schoolId, classIds)
- [ ] Implement school-aware and role-based broadcast filtering
- [ ] Create conversation helper functions
- [ ] Implement message handler with database integration
- [ ] Implement typing handler for typing indicators
- [ ] Add targeted user presence broadcasting (by school/role/class)
- [ ] Integrate socket server with main app.ts

### Documentation
- [ ] Document socket event API
- [ ] Document REST API endpoints
- [ ] Add error handling and logging

