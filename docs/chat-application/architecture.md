# Chat Application Architecture

## System Overview

The Ryland LMS Chat Application implements a hybrid architecture combining real-time WebSocket communication with persistent MongoDB storage. This design ensures instant message delivery for online users while maintaining complete message history for offline access.

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│  ┌──────────────┐        ┌──────────────┐                     │
│  │  React/Next  │        │  Socket.IO   │                     │
│  │  Components  │◄──────►│    Client    │                     │
│  └──────────────┘        └──────────────┘                     │
│         │                        │                              │
│         │ REST API               │ WebSocket                   │
└─────────┼────────────────────────┼──────────────────────────────┘
          │                        │
          ▼                        ▼
┌────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────────┐             │
│  │ Feathers REST   │    │  Socket.IO Server    │             │
│  │   Services      │    │   /chat-socket/      │             │
│  │                 │    │                      │             │
│  │ - conversations │    │ - Authentication     │             │
│  │ - messages      │    │ - Connection Mgr     │             │
│  └────────┬────────┘    │ - Event Handlers     │             │
│           │             └──────────┬───────────┘             │
│           │                        │                          │
│           └────────────┬───────────┘                          │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐         │
│  │              MongoDB Database                     │         │
│  │                                                   │         │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────┐ │         │
│  │  │conversations│  │   messages    │  │ users  │ │         │
│  │  └─────────────┘  └──────────────┘  └────────┘ │         │
│  └──────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Socket Server (`src/socket/chatSocket.js`)

The main entry point for WebSocket connections.

**Responsibilities:**
- Initialize Socket.IO server instance
- Apply authentication middleware
- Query user's classes on connection
- Manage connection lifecycle
- Register event handlers
- Broadcast presence updates

**Key Features:**
- Separate server instance on path `/chat-socket/`
- JWT-based authentication
- Multi-device connection support
- School-aware presence broadcasting

**Connection Flow:**

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. Connect with JWT token
     ▼
┌──────────────────────┐
│ Authentication       │
│ Middleware           │
└────┬─────────────────┘
     │
     │ 2. Verify token, fetch user
     ▼
┌──────────────────────┐
│ Query User Classes   │
│ (based on role)      │
└────┬─────────────────┘
     │
     │ 3. Add to Connection Manager
     ▼
┌──────────────────────┐
│ Broadcast Online     │
│ (school-aware)       │
└────┬─────────────────┘
     │
     │ 4. Register Event Handlers
     ▼
┌──────────────────────┐
│ Ready to Send/Receive│
└──────────────────────┘
```

### 2. Connection Manager (`src/socket/connectionManager.js`)

Tracks online users with multi-index data structure for efficient lookups.

**Data Structures:**

```javascript
{
  // Primary index
  userSocketMap: Map<userId, Socket[]>,
  
  // User metadata
  userMetadataMap: Map<userId, {
    userRole: string,
    schoolId: string,
    classIds: string[]
  }>,
  
  // Secondary indexes (O(1) lookups)
  schoolIndex: Map<schoolId, Set<userId>>,
  schoolRoleIndex: Map<schoolId, Map<role, Set<userId>>>,
  classIndex: Map<classId, Set<userId>>
}
```

**Performance:**
- O(1) user lookup by ID
- O(1) school filtering
- O(1) role filtering (scoped to school)
- O(1) class filtering
- O(k) where k = number of classes for teacher/student queries

**School-Aware Broadcasting:**

```
User connects
    ↓
Query classes based on role
    ↓
Store metadata (role, schoolId, classIds)
    ↓
Update all indexes
    ↓
Calculate broadcast targets
    ↓
Send presence to relevant users only
```

**Broadcasting Rules:**

| User Role | Broadcasts Presence To |
|-----------|----------------------|
| Student | - Teachers in ANY of student's classes<br>- Students in SAME classes |
| Teacher | - All other teachers in school<br>- All students in teacher's classes |
| Admin | - All users in the school |

### 3. Event Handlers

#### Message Handler (`src/socket/handlers/messageHandler.js`)

Handles all message operations with database persistence.

**Flow for Sending Message:**

```
Client A sends message
    ↓
Find/Create conversation
    ↓
Save message to database ✓
    ↓
Update conversation metadata ✓
    ↓
Check if recipient online
    ↓
├─ Yes → Emit to recipient sockets
│         └─ Mark as delivered in DB ✓
│
└─ No → Message stays as 'sent'
    │
    └─ Recipient gets via REST API when online
    ↓
Send confirmation to sender
```

**Events Handled:**
- `message:send` - Create and broadcast new message
- `message:read` - Update read status in DB, notify sender
- `message:update` - Edit message in DB, notify recipient
- `message:delete` - Soft delete in DB, notify recipient

#### Typing Handler (`src/socket/handlers/typingHandler.js`)

Handles typing indicators (ephemeral, no DB persistence).

**Events Handled:**
- `typing:start` - Forward to recipient if online
- `typing:stop` - Forward to recipient if online

### 4. Feathers Services

#### Conversations Service (`src/services/conversations/`)

RESTful API for conversation management.

**Architecture:**

```
conversations.service.ts (registration)
    ↓
conversations.class.ts (business logic)
    ├─ find() - List user's conversations
    ├─ get() - Get specific conversation
    ├─ create() - Create new conversation
    ├─ patch() - Update conversation
    └─ remove() - Soft delete
    ↓
conversations.hooks.ts (middleware)
    ├─ authenticate('jwt') on all methods
    └─ populate participants
    ↓
conversations.model.ts (MongoDB schema)
```

**Key Methods:**

| Method | Purpose | Authorization |
|--------|---------|---------------|
| `find()` | List conversations | User must be participant |
| `create()` | New conversation | Validates recipient exists |
| `patch()` | Update metadata | User must be participant |
| `remove()` | Archive conversation | User must be participant |

#### Messages Service (`src/services/messages/`)

RESTful API for message operations.

**Architecture:**

```
messages.service.ts (registration)
    ↓
messages.class.ts (business logic)
    ├─ find() - List messages (requires conversationId)
    ├─ get() - Get specific message
    ├─ create() - Create new message
    │   └─ Auto-updates conversation
    ├─ patch() - Update message (edit/read/delivered)
    └─ remove() - Soft delete (sender only)
    ↓
messages.hooks.ts (middleware)
    ├─ authenticate('jwt') on all methods
    └─ populate sender/recipient
    ↓
messages.model.ts (MongoDB schema)
```

**Key Features:**
- Automatically updates conversation's `lastMessage` on create
- Increments recipient's `unreadCount` on create
- Resets user's `unreadCount` when marking as read
- Only sender can edit/delete their messages

#### Messaging Contacts Service (`src/services/messaging-contacts/`)

RESTful API for role-based contact discovery.

**Architecture:**

```
messaging-contacts.service.ts (registration)
    ↓
messaging-contacts.class.ts (business logic)
    ├─ find() - Route based on user role
    ├─ getStudentContacts() - Classmates + teachers
    ├─ getTeacherContacts() - Students + fellow teachers
    └─ getAdminContacts() - All users
    ↓
messaging-contacts.hooks.ts (middleware)
    ├─ authenticate('jwt') on all methods
    ├─ validateQuery() - Validate query params
    ├─ authorizeContactAccess() - Admin role override
    └─ schoolAwareFilter() - Multi-tenant filtering
    ↓
contact-aggregations.ts (MongoDB aggregations)
    ├─ getStudentContactsAggregation()
    ├─ getTeacherContactsAggregation()
    └─ getAdminContactsAggregation()
```

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `find()` | Get contacts for user | Filtered contact list |
| `getStudentContacts()` | Student contacts | Classmates + teachers |
| `getTeacherContacts()` | Teacher contacts | Students + fellow teachers |
| `getAdminContacts()` | Admin contacts | All system users |

**Role-Based Filtering:**

```
Student:
  └─ Enrolled in classes
      ├─ Classmates (same classes)
      └─ Teachers (teaching those classes)

Teacher:
  ├─ Teaching classes
  │   └─ Students (enrolled in those classes)
  └─ Same school
      └─ Fellow teachers

Admin:
  └─ System-wide
      └─ All users (sorted by role, name)
```

**Performance Optimizations:**
- Direct model access (no service layer overhead)
- MongoDB aggregation pipelines with `$unionWith`
- Database-level deduplication using `$group`
- Selective field fetching with `.select()`
- Lean queries for plain JavaScript objects
- Leverages existing indexes on classEnrollments and classTeachers

**Security Features:**
- JWT authentication required
- Role-based filtering enforced at database level
- School-aware filtering for multi-tenancy
- Admin role override validation
- Query parameter validation

### 5. Database Layer

#### Conversations Collection

```javascript
{
  _id: ObjectId,
  participants: [ObjectId, ObjectId],  // Exactly 2
  lastMessage: {
    content: String,
    senderId: ObjectId,
    timestamp: Date
  },
  lastMessageAt: Date,
  unreadCount: Map {
    userId1: Number,
    userId2: Number
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ participants: 1 }` - Find user's conversations
- `{ lastMessageAt: -1 }` - Sort by recent
- `{ participants: 1 }` (unique) - Prevent duplicates

#### Messages Collection

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  recipientId: ObjectId,
  content: String,
  status: {
    delivered: Boolean,
    deliveredAt: Date,
    read: Boolean,
    readAt: Date
  },
  isEdited: Boolean,
  editedAt: Date,
  originalContent: String,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ conversationId: 1, createdAt: -1 }` - Paginated retrieval
- `{ senderId: 1, recipientId: 1, createdAt: -1 }` - User queries
- `{ conversationId: 1, isDeleted: 1 }` - Filter deleted

## Data Flow

### Message Send Flow (Online Recipient)

```
┌─────────┐                                                    ┌─────────┐
│Client A │                                                    │Client B │
└────┬────┘                                                    └────┬────┘
     │                                                              │
     │ 1. emit('message:send')                                     │
     ▼                                                              │
┌──────────────────┐                                               │
│ Socket Server    │                                               │
│ (Message Handler)│                                               │
└────┬─────────────┘                                               │
     │                                                              │
     │ 2. Save to DB                                               │
     ▼                                                              │
┌──────────────────┐                                               │
│   MongoDB        │                                               │
│ - messages       │                                               │
│ - conversations  │                                               │
└────┬─────────────┘                                               │
     │                                                              │
     │ 3. Check recipient online                                   │
     ├─ Yes ────────────────────────────────────────────────────► │
     │  emit('message:receive')                                    │
     │                                                              │
     │ 4. Mark as delivered in DB                                  │
     ▼                                                              │
┌──────────────────┐                                               │
│   MongoDB        │                                               │
│ - Update status  │                                               │
└────┬─────────────┘                                               │
     │                                                              │
     │ 5. Send confirmation                                        │
     ▼                                                              │
┌─────────┐                                                        │
│Client A │◄───────────────────────────────────────────────────── │
│ emit('message:delivered')                                       │
└─────────┘                                                        │
```

### Message Send Flow (Offline Recipient)

```
┌─────────┐                                                    ┌─────────┐
│Client A │                                                    │Client B │
└────┬────┘                                                    │(offline)│
     │                                                          └─────────┘
     │ 1. emit('message:send')
     ▼
┌──────────────────┐
│ Socket Server    │
└────┬─────────────┘
     │
     │ 2. Save to DB
     ▼
┌──────────────────┐
│   MongoDB        │
│ status.delivered = false │
└────┬─────────────┘
     │
     │ 3. Check recipient online
     ├─ No (offline)
     │
     │ 4. Send confirmation
     ▼
┌─────────┐
│Client A │
│ recipientOnline: false │
└─────────┘

Later...

┌─────────┐
│Client B │ 1. Comes online
└────┬────┘
     │
     │ 2. Fetches via REST API
     ▼
┌──────────────────┐
│ GET /messages?   │
│ conversationId=x │
└────┬─────────────┘
     │
     │ 3. Receives undelivered messages
     ▼
┌─────────┐
│Client B │
└─────────┘
```

## Security Architecture

### Authentication Flow

```
Client connects
    ↓
Extract JWT from handshake.query.token
    ↓
Verify token via authentication service
    ↓
Fetch user from database
    ↓
Attach user object to socket
    ↓
Connection established
```

### Authorization Layers

1. **Socket Level**: JWT required for connection
2. **Service Level**: User must be conversation participant
3. **Operation Level**: Role-specific permissions (e.g., only sender can delete)

### Data Protection

- **Input Validation**: All fields validated before DB operations
- **SQL Injection**: Protected by Mongoose ODM
- **XSS Protection**: Content sanitization handled by frontend
- **Soft Deletes**: Maintains audit trail
- **Scoped Access**: Users only see their conversations

## Scalability Considerations

### Current Implementation

**Single Server:**
- Connection Manager uses in-memory Map
- Works for up to ~10,000 concurrent connections
- No cross-server communication needed

### Future Scaling (Multi-Server)

**Horizontal Scaling Approach:**

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Server 1 │    │ Server 2 │    │ Server 3 │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
                     ▼
            ┌──────────────┐
            │    Redis     │
            │   Adapter    │
            └──────────────┘
```

**Required Changes:**
1. Add Redis adapter for Socket.IO
2. Store connection state in Redis
3. Use Redis Pub/Sub for cross-server events
4. Implement sticky sessions (same user → same server)

## Error Handling

### Socket Errors

```
Authentication Error
    ↓
Disconnect socket
    ↓
Client receives 'connect_error'
    ↓
Client redirects to login
```

### Message Errors

```
Message Operation Fails
    ↓
Emit 'message:error' to client
    ↓
Client shows error notification
    ↓
Client rolls back optimistic update
```

### Database Errors

```
DB Operation Fails
    ↓
Log error server-side
    ↓
Return error response
    ↓
Client handles gracefully
```

## Monitoring Points

Key metrics to track:

1. **Connection Metrics**:
   - Active connections count
   - Connection success/failure rate
   - Average connection duration

2. **Message Metrics**:
   - Messages sent per second
   - Message delivery rate
   - Average delivery latency

3. **Database Metrics**:
   - Query response times
   - Database connection pool usage
   - Index hit rates

4. **Error Metrics**:
   - Authentication failures
   - Message send failures
   - Database errors

## Performance Optimizations

### Database

- **Indexes**: All common queries use indexes
- **Pagination**: Limit result sets to 50 items default
- **Selective Population**: Only populate needed fields

### Socket

- **Targeted Broadcasting**: Only send to relevant users
- **Multi-Index Lookups**: O(1) filtering operations
- **Connection Validation**: Check socket.connected before emit

### Application

- **Async Operations**: All DB operations are async
- **Error Boundaries**: Isolated error handling per handler
- **Graceful Degradation**: Offline messages via REST API fallback

