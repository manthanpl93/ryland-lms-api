# Change 8: Function - Integration with app.ts

**Type:** Function  
**Location:** `app.ts`  
**Status:** [~] Modified

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Integrate the new socket server with the existing Feathers application. Import and initialize the chat socket server alongside existing socket functionality.

## Affected Files

```
src/
├── [~] app.ts ──→ Import and initialize chat socket server
│
└── socket/
    └── [+] socket.js ──→ Socket server module
```

**Legend:** [~] Modified, [+] New

## Logic/Implementation

### Logical Block 1: Socket Server Import

**What it does:**
Imports the chat socket initialization function and calls it with the Feathers app instance.

**Why added/changed:**
Need to start the chat socket server when the application initializes.

**Implementation approach:**
```javascript
const initializeSocketServer = require('./socket/socket');

// After existing socket.io configuration
const chatIo = initializeSocketServer(app);
app.set('chatIo', chatIo); // Store for later use
```

## Code Changes

### In `app.ts`:

**Adding socket server initialization:**
```typescript
// Existing imports...
import initializeSocketServer from './socket/socket';

// ... existing app configuration ...

// EXISTING: Configure socket.io for AI quiz (keep as is)
app.configure(
  socketio({ maxHttpBufferSize: 5 * 1e9 }, function (io) {
    // ... existing AI quiz socket code ...
  })
);

// NEW: Initialize chat socket server
console.log("🚀 Initializing chat socket server...");
const chatIo = initializeSocketServer(app);
app.set('chatIo', chatIo);
console.log("✅ Chat socket server initialized");

// Set up our services (see `services/index.ts`)
app.configure(services);
```

## Dependencies

- [+] `socket/socket.js` (Function) - Chat socket server

## Models & Types

```typescript
// Feathers app with chat socket
interface Application {
  get(key: 'chatIo'): Server; // Socket.IO server instance
  // ... existing app properties
}
```

## Error Codes

**Common Errors:**
- **500 GeneralError:** `'Failed to initialize chat socket server'` - Initialization error

**Usage:**
```javascript
try {
  const chatIo = initializeSocketServer(app);
  app.set('chatIo', chatIo);
} catch (error) {
  console.error('Failed to initialize chat socket server:', error);
  throw error;
}
```

---

[← Back to API Design Overview](../3-api-design.md)

