# Change 1: Function - initializeSocketServer

**Type:** Function  
**Location:** `socket/socket.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Creates and configures the Socket.IO server instance with authentication middleware, event handlers, and connection lifecycle management. This function integrates with the existing Feathers app and registers all socket event handlers.

## Affected Files

```
src/
├── socket/
│   └── [+] socket.js ──→ Socket.IO server initialization
│
└── [~] app.ts ──→ Import and configure socket server
```

**Legend:** [+] New, [~] Modified

## Logic/Implementation

### Logical Block 1: Socket Server Initialization

**What it does:**
Creates a Socket.IO server instance attached to the Feathers HTTP server with proper configuration options.

**Why added/changed:**
Need a dedicated Socket.IO instance for chat functionality with custom configuration for message size limits and transports.

**Implementation approach:**
```javascript
// Initialize Socket.IO with configuration
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
  maxHttpBufferSize: 1e8, // 100MB for future file uploads
  transports: ['websocket', 'polling']
});

// Apply authentication middleware
io.use(authenticateSocket(app));

// Handle connections
io.on('connection', (socket) => {
  // Register user connection
  // Initialize event handlers
  // Handle disconnection
});
```

### Logical Block 2: Connection Handler Registration

**What it does:**
Registers all event handlers (message, typing) when a new socket connection is established.

**Why added/changed:**
Each socket needs to listen to specific events and route them through appropriate handlers.

**Implementation approach:**
```javascript
io.on('connection', (socket) => {
  const user = socket.user; // From auth middleware
  
  // Add to connection manager
  connectionManager.addConnection(user._id, socket);
  
  // Register handlers
  messageHandler(io, socket, connectionManager);
  typingHandler(io, socket, connectionManager);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    connectionManager.removeConnection(user._id, socket.id);
  });
});
```

## Code Changes

### In `socket/socket.js`:

**Adding new function:**
```javascript
const { Server } = require('socket.io');
const authenticateSocket = require('./auth');
const connectionManager = require('./connectionManager');
const messageHandler = require('./handlers/messageHandler');
const typingHandler = require('./handlers/typingHandler');
const { EVENT_GROUPS } = require('./constants/events');

/**
 * Initialize Socket.IO server for chat functionality
 * @param {Application} app - Feathers application instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocketServer(app) {
  const httpServer = app.get('server');
  
  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    },
    maxHttpBufferSize: 1e8, // 100MB
    transports: ['websocket', 'polling']
  });
  
  // Apply authentication middleware
  io.use(authenticateSocket(app));
  
  // Connection handler
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user._id} (Socket: ${socket.id})`);
    
    // Add to connection manager
    connectionManager.addConnection(user._id, socket);
    
    // Broadcast user online status
    const wasOffline = connectionManager.getUserSockets(user._id).length === 1;
    if (wasOffline) {
      socket.broadcast.emit(EVENT_GROUPS.USER.ONLINE, {
        userId: user._id,
        timestamp: new Date()
      });
    }
    
    // Register event handlers
    messageHandler(io, socket, connectionManager);
    typingHandler(io, socket, connectionManager);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user._id} (Socket: ${socket.id})`);
      connectionManager.removeConnection(user._id, socket.id);
      
      // Broadcast user offline status
      const isOffline = connectionManager.getUserSockets(user._id).length === 0;
      if (isOffline) {
        io.emit(EVENT_GROUPS.USER.OFFLINE, {
          userId: user._id,
          timestamp: new Date()
        });
      }
    });
  });
  
  console.log('Socket.IO server initialized for chat');
  return io;
}

module.exports = initializeSocketServer;
```

## Dependencies

- [+] `socket.io` (Package) - WebSocket library
- [+] `auth.js` (Middleware) - Socket authentication
- [+] `connectionManager.js` (Function) - Connection management
- [+] `messageHandler.js` (Handler) - Message events
- [+] `typingHandler.js` (Handler) - Typing events
- [+] `events.js` (Constants) - Event definitions

## Models & Types

```typescript
// Socket with authenticated user
interface AuthenticatedSocket extends Socket {
  user: {
    _id: string;
    email: string;
    role: string;
  };
}

// Socket server configuration
interface SocketServerConfig {
  cors: {
    origin: string;
    credentials: boolean;
  };
  maxHttpBufferSize: number;
  transports: string[];
}
```

## Error Codes

**Common Errors:**
- **401 NotAuthenticated:** `'Invalid or missing JWT token'` - Socket authentication fails
- **500 GeneralError:** `'Socket server initialization failed'` - Server setup error

**Usage:**
```javascript
// Authentication middleware will handle errors
socket.emit('error', { code: 401, message: 'Invalid or missing JWT token' });
```

---

[← Back to API Design Overview](../3-api-design.md)

