# Architecture

## High-Level Changes

Phase 1 introduces a complete chat backend with real-time and persistent storage layers:

**Database Layer:**
- Adding MongoDB models for `conversations` and `messages` collections
- Implementing Mongoose schemas with indexes for performance
- Adding status tracking (delivered, read) and edit/delete history

**Service Layer:**
- Creating Feathers services for conversations and messages
- Implementing REST APIs for message history and conversation management
- Adding authentication and authorization hooks

**Socket Layer:**
- Creating `socket/` directory with modular socket management
- Implementing JWT-based authentication middleware for socket connections
- Building event-driven message and typing handlers
- Creating in-memory connection manager with multi-index structure:
  - Primary index: userId → connections
  - Secondary indexes: schoolId, schoolId+role, classId for O(1) filtering
  - Metadata storage: userRole, schoolId, classIds per connection
- Querying user's classes on connection (class-teachers/class-enrollments)
- School-aware and role-based presence broadcasting
- Defining grouped event constants for consistent client-server communication
- Integrating socket handlers with database services

**Integration:**
- Socket handlers use Feathers services to persist messages
- Real-time events broadcast to online users
- Offline users retrieve messages via REST API when reconnecting

## Flow Diagram

### Socket Connection Flow

```
Client                    Socket Server              Auth Service           Connection Manager
  |                            |                           |                         |
  |-- connect(JWT) ----------->|                           |                         |
  |                            |-- verify JWT ------------>|                         |
  |                            |<-- user data -------------|                         |
  |                            |-- add connection ----------------------->|         |
  |                            |                           |               |         |
  |<-- connected --------------|                           |               |         |
  |<-- user:online ------------|                           |               |         |
  |                            |                           |               |         |
```

### Message Delivery Flow

```
Sender                    Socket Server              Connection Manager      Receiver
  |                            |                           |                    |
  |-- message:send ----------->|                           |                    |
  |                            |-- get recipient sockets ->|                    |
  |                            |<-- socket array -----------|                    |
  |                            |                           |                    |
  |<-- message:delivered ------|                           |                    |
  |                            |-- forward message --------------------------->|
  |                            |                           |                    |
  |                            |<-- message:read ----------------------------------
  |<-- message:read -----------|                           |                    |
```

### Typing Indicator Flow

```
User A                    Socket Server              Connection Manager      User B
  |                            |                           |                    |
  |-- typing:start ----------->|                           |                    |
  |                            |-- get recipient sockets ->|                    |
  |                            |<-- socket array -----------|                    |
  |                            |-- notify typing ------------------------>|
  |                            |                           |                    |
  |-- typing:stop ------------>|                           |                    |
  |                            |-- notify stop typing ---------------------->|
```

### User Presence Flow (School-Aware)

```
User                Socket Server       Class Services      Connection Manager    Relevant Users
  |                      |                    |                    |                    |
  |-- connect(JWT) ----->|                    |                    |                    |
  |                      |                    |                    |                    |
  |                      |-- query classes -->|                    |                    |
  |                      |   (based on role)  |                    |                    |
  |                      |<-- classIds[] -----|                    |                    |
  |                      |                    |                    |                    |
  |                      |-- add connection(userId, socket, ------->|                    |
  |                      |    {userRole, schoolId, classIds})       |                    |
  |                      |                    |                    |                    |
  |                      |                    |    [Updates indexes:]                   |
  |                      |                    |    - schoolIndex                        |
  |                      |                    |    - schoolRoleIndex                    |
  |                      |                    |    - classIndex                         |
  |                      |                    |                    |                    |
  |                      |<-- getBroadcastTargets(userId) ----------|                    |
  |                      |    [Returns targetUserIds based on role] |                    |
  |                      |                    |                    |                    |
  |                      |-- broadcast user:online(userId, role) ----------------------->|
  |                      |   [Only to relevant school/class users]  |                    |
  |<-- connected --------|                    |                    |                    |
  |                      |                    |                    |                    |
  |-- disconnect ------->|                    |                    |                    |
  |                      |-- remove connection(userId, socketId) -->|                    |
  |                      |                    |    [Cleans indexes if last connection] |
  |                      |                    |                    |                    |
  |                      |<-- getBroadcastTargets(userId) ----------|                    |
  |                      |-- broadcast user:offline(userId) -------------------------->|
```

### School-Aware Broadcasting Rules

**Student Presence → Broadcasts to:**
- Teachers who teach ANY of the student's classes (same school)
- Students enrolled in the SAME classes (same school)

**Teacher Presence → Broadcasts to:**
- All other teachers in the school
- All students in classes they teach

**Admin Presence → Broadcasts to:**
- All users in the school (teachers, students, admins)

## Source Code View

```
src/
├── models/
│   ├── [+] conversations.model.ts ──→ Conversation threads model
│   └── [+] messages.model.ts ──→ Chat messages model
│
├── services/
│   ├── conversations/
│   │   ├── [+] conversations.service.ts ──→ Service registration
│   │   ├── [+] conversations.class.ts ──→ Service class with methods
│   │   ├── [+] conversations.hooks.ts ──→ Before/after hooks
│   │   └── [+] conversations.types.ts ──→ TypeScript interfaces
│   │
│   ├── messages/
│   │   ├── [+] messages.service.ts ──→ Service registration
│   │   ├── [+] messages.class.ts ──→ Service class with methods
│   │   ├── [+] messages.hooks.ts ──→ Before/after hooks
│   │   └── [+] messages.types.ts ──→ TypeScript interfaces
│   │
│   └── [~] index.ts ──→ Register new services
│
├── socket/
│   ├── [+] socket.js ──→ Socket.IO server initialization with class queries
│   ├── [+] auth.js ──→ JWT authentication middleware
│   ├── [+] connectionManager.js ──→ Multi-index connection management (school/role/class)
│   │
│   ├── constants/
│   │   └── [+] events.js ──→ Grouped event definitions
│   │
│   ├── handlers/
│   │   ├── [+] messageHandler.js ──→ Message events + DB integration
│   │   └── [+] typingHandler.js ──→ Typing indicator handling
│   │
│   └── helpers/
│       └── [+] conversationHelper.js ──→ Conversation lookup utilities
│
├── [~] app.ts ──→ Integrate socket server with Feathers app
│
└── types/
    └── [+] socket.types.ts ──→ TypeScript interfaces for socket events
```

**Legend:**
- [+] New file
- [~] Modified file

