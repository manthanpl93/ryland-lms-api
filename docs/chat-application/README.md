# Chat Application Documentation

## Overview

The Ryland LMS Chat Application is a real-time messaging system that enables 1-on-1 conversations between users (students, teachers, and admins) within the platform. It combines WebSocket communication for instant messaging with MongoDB persistence for message history and offline delivery.

## Features

### Core Messaging

- ✅ Real-time 1-on-1 messaging via WebSocket
- ✅ Message persistence to MongoDB
- ✅ Offline message delivery (via REST API)
- ✅ Read receipts and delivery confirmations
- ✅ Message editing and deletion (soft delete)
- ✅ Typing indicators
- ✅ User presence tracking (online/offline)
- ✅ School-aware presence broadcasting
- ✅ Multi-device support (mobile, web, desktop)

### Contact Discovery

- ✅ Role-based contact lists (Students, Teachers, Admins)
- ✅ Automatic contact filtering based on relationships
- ✅ Student contacts: Classmates + their teachers
- ✅ Teacher contacts: Class students + fellow teachers from same school
- ✅ Admin contacts: All users in the system
- ✅ Efficient MongoDB aggregations for contact fetching
- ✅ School-aware filtering for multi-tenancy

### Security & Access Control

- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ School-aware multi-tenancy
- ✅ Direct model access for optimal performance

### Future Features (Planned)

- 📋 Group Chat (3+ participants)
- 📋 Media & File Attachments
- 📋 Advanced Features (search, push notifications, reactions)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (React/Next.js with Socket.IO Client + REST API Client)   │
└───────────────────┬─────────────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
    ▼                               ▼
┌─────────────────┐         ┌─────────────────┐
│  SOCKET.IO      │         │  REST API       │
│  (Real-time)    │         │  (Feathers.js)  │
│  /chat-socket/  │         │  /conversations │
└────────┬────────┘         │  /messages      │
         │                  └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌─────────────────────┐
         │   SERVICE LAYER     │
         │  - Conversations    │
         │  - Messages         │
         │  - Messaging        │
         │    Contacts         │
         │  - Users (existing) │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   DATABASE LAYER    │
         │     (MongoDB)       │
         │  - conversations    │
         │  - messages         │
         │  - users (existing) │
         └─────────────────────┘
```

## Key Components

### 1. Database Models

- **Conversations Model**: Tracks 1-on-1 conversation threads
  - Participants (2 users)
  - Last message metadata
  - Unread count per user
  - Timestamps

- **Messages Model**: Stores individual chat messages
  - Conversation reference
  - Sender and recipient
  - Content
  - Status (delivered, read)
  - Edit and delete tracking

### 2. Feathers Services

- **Conversations Service**: RESTful API for conversation management
  - List user's conversations
  - Create new conversations
  - Update conversation metadata
  - Mark messages as read

- **Messages Service**: RESTful API for message operations
  - Retrieve message history (paginated)
  - Create new messages
  - Update messages (edit, mark as read)
  - Delete messages (soft delete)

- **Messaging Contacts Service**: RESTful API for contact discovery
  - Get role-based contact lists
  - Automatic filtering by user relationships
  - School-aware contact filtering
  - Efficient MongoDB aggregations

### 3. Socket Infrastructure

- **Chat Socket Server**: Separate Socket.IO instance for chat
  - Path: `/chat-socket/`
  - JWT authentication
  - Multi-device support

- **Connection Manager**: Tracks online users with multi-index structure
  - Primary index: userId → sockets
  - Secondary indexes: schoolId, schoolId+role, classId
  - O(1) lookups for school/role/class filtering

- **Event Handlers**:
  - Message Handler: Send, receive, read, update, delete messages
  - Typing Handler: Typing start/stop indicators

- **School-Aware Broadcasting**: Presence updates are targeted
  - Students → Teachers in their classes + classmates
  - Teachers → All teachers + their students
  - Admins → All users in their school

## Technology Stack

- **Backend Framework**: Feathers.js
- **Real-time Communication**: Socket.IO
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (existing infrastructure)
- **Language**: TypeScript (services) & JavaScript (socket handlers)

## Documentation Structure

- [Architecture](./architecture.md) - Detailed system architecture
- [API Reference](./api-reference.md) - REST API endpoints
- [Socket Events](./socket-events.md) - WebSocket event documentation
- [Database Schema](./database-schema.md) - MongoDB collections and indexes
- [Contacts Service](./contacts.md) - Contact discovery and filtering
- [Deployment Guide](./deployment.md) - Production deployment instructions

## Quick Start

### Server Setup

The chat infrastructure is automatically initialized when the Feathers app starts:

1. **Database models** are registered via Mongoose
2. **Feathers services** are configured in `services/index.ts`
3. **Socket server** is initialized in `app.ts`

No additional setup required beyond standard Feathers app configuration.

### Client Connection

```javascript
import io from 'socket.io-client';

// Connect to chat socket server
const socket = io('http://localhost:3030', {
  path: '/chat-socket/',
  query: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket', 'polling']
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to chat server');
});

// Listen for messages
socket.on('message:receive', (message) => {
  console.log('New message:', message);
});

// Send a message
socket.emit('message:send', {
  recipientId: 'user123',
  content: 'Hello!',
  tempId: 'temp-' + Date.now(),
  conversationId: 'optional-conversation-id'
});
```

### REST API Usage

```javascript
// Fetch user's conversations
const conversations = await fetch('/conversations', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

// Fetch messages for a conversation
const messages = await fetch('/messages?conversationId=conv123', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

## Security

- ✅ JWT authentication on all socket connections
- ✅ Authorization checks: Users can only access their conversations
- ✅ Sender-only permissions for edit/delete operations
- ✅ Input validation on all endpoints
- ✅ Soft deletes maintain audit trail
- ✅ SQL injection protection via Mongoose ODM

## Performance Considerations

- **Connection Manager**: O(1) lookups via multi-index structure
- **Database Indexes**: Optimized for common query patterns
- **Pagination**: All list endpoints support pagination
- **Targeted Broadcasting**: Presence updates only to relevant users
- **Multi-device Support**: Single user can have multiple connections

## Monitoring

Key metrics to monitor:

- Active socket connections count
- Message throughput (messages/second)
- Database query performance
- Socket connection errors
- Authentication failures

## Support

For issues or questions:

1. Check this documentation
2. Review the [API Reference](./api-reference.md)
3. Check [Socket Events](./socket-events.md)
4. Contact the development team

## Version History

- **v1.1.0** (December 16, 2025) - Contact Discovery
  - Role-based contact lists
  - Relationship-aware filtering
  - Multi-tenancy support
  - Performance optimizations with direct model access

- **v1.0.0** (December 2025) - Initial Release
  - Real-time 1-on-1 messaging
  - Message persistence
  - School-aware presence broadcasting
  - WebSocket and REST API support

