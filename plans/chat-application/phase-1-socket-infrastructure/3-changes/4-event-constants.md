# Change 4: Type - EVENT_GROUPS

**Type:** Constants  
**Location:** `socket/constants/events.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Defines all socket event names organized into logical groups (USER, MESSAGE, TYPING). This provides a single source of truth for event naming and makes it easy to discover available events.

## Affected Files

```
src/
└── socket/
    └── constants/
        └── [+] events.js ──→ Event constant definitions
```

**Legend:** [+] New

## Logic/Implementation

### Logical Block 1: Event Grouping

**What it does:**
Organizes events into logical groups based on functionality.

**Why added/changed:**
Improves code organization and makes it easy to see all events related to a specific feature.

**Implementation approach:**
```javascript
const EVENT_GROUPS = {
  USER: {
    ONLINE: 'user:online',
    OFFLINE: 'user:offline'
  },
  MESSAGE: {
    SEND: 'message:send',
    DELIVERED: 'message:delivered',
    // ... more events
  }
};
```

## Code Changes

### In `socket/constants/events.js`:

**Adding event constants:**
```javascript
/**
 * Socket event constants organized by feature
 * Format: feature:action
 */
const EVENT_GROUPS = {
  // User presence events
  USER: {
    ONLINE: 'user:online',           // User came online
    OFFLINE: 'user:offline',         // User went offline
  },
  
  // Message events
  MESSAGE: {
    SEND: 'message:send',           // Client sends message
    RECEIVE: 'message:receive',     // Client receives message
    DELIVERED: 'message:delivered', // Message delivered confirmation
    READ: 'message:read',           // Message read confirmation
    UPDATE: 'message:update',       // Update existing message
    DELETE: 'message:delete',       // Delete message
    ERROR: 'message:error',         // Message operation error
  },
  
  // Typing indicator events
  TYPING: {
    START: 'typing:start',          // User started typing
    STOP: 'typing:stop',            // User stopped typing
  },
};

/**
 * Client-to-Server events
 * Events that clients emit to the server
 */
const CLIENT_TO_SERVER = [
  EVENT_GROUPS.MESSAGE.SEND,
  EVENT_GROUPS.MESSAGE.READ,
  EVENT_GROUPS.MESSAGE.UPDATE,
  EVENT_GROUPS.MESSAGE.DELETE,
  EVENT_GROUPS.TYPING.START,
  EVENT_GROUPS.TYPING.STOP,
];

/**
 * Server-to-Client events
 * Events that server emits to clients
 */
const SERVER_TO_CLIENT = [
  EVENT_GROUPS.USER.ONLINE,
  EVENT_GROUPS.USER.OFFLINE,
  EVENT_GROUPS.MESSAGE.RECEIVE,
  EVENT_GROUPS.MESSAGE.DELIVERED,
  EVENT_GROUPS.MESSAGE.READ,
  EVENT_GROUPS.MESSAGE.UPDATE,
  EVENT_GROUPS.MESSAGE.DELETE,
  EVENT_GROUPS.MESSAGE.ERROR,
  EVENT_GROUPS.TYPING.START,
  EVENT_GROUPS.TYPING.STOP,
];

module.exports = {
  EVENT_GROUPS,
  CLIENT_TO_SERVER,
  SERVER_TO_CLIENT,
};
```

## Dependencies

- None (constants only)

## Models & Types

```typescript
// Event group structure
interface EventGroups {
  USER: {
    ONLINE: string;
    OFFLINE: string;
  };
  MESSAGE: {
    SEND: string;
    RECEIVE: string;
    DELIVERED: string;
    READ: string;
    UPDATE: string;
    DELETE: string;
    ERROR: string;
  };
  TYPING: {
    START: string;
    STOP: string;
  };
}

// Event constants
type ClientToServerEvents = string[];
type ServerToClientEvents = string[];
```

---

[← Back to API Design Overview](../3-api-design.md)

