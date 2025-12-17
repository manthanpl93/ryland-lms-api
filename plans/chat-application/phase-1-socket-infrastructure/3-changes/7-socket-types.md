# Change 7: Socket Type Definitions

**Type:** TypeScript Types  
**Location:** `socket/handlers/types/` and `types/socket.types.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

TypeScript interface definitions for socket events organized by handler domain. Provides type safety for socket communication between client and server with modular type organization.

## Affected Files

```
src/
├── types/
│   └── [+] socket.types.ts ──→ Core socket type definitions
└── socket/
    └── handlers/
        └── types/
            ├── [+] message.types.ts ──→ Message handler types
            ├── [+] typing.types.ts ──→ Typing handler types
            └── [+] presence.types.ts ──→ Presence handler types
```

**Legend:** [+] New

## Code Changes

### In `types/socket.types.ts`:

**Adding core socket types:**
```typescript
import { Socket } from 'socket.io';

/**
 * Authenticated socket with user data
 */
export interface AuthenticatedSocket extends Socket {
  user: {
    _id: string;
    email: string;
    role: string;
  };
}

/**
 * User metadata stored with connections
 */
export interface UserMetadata {
  role: string;
  schoolId: string;
  classIds: string[];
}

/**
 * Filter criteria for querying users
 */
export interface UserFilters {
  schoolId?: string;
  role?: string;
  classId?: string;
}

/**
 * Connection manager interface
 */
export interface IConnectionManager {
  // Primary storage
  userSocketMap: Map<string, Socket[]>;
  userMetadataMap: Map<string, UserMetadata>;
  
  // Secondary indexes
  schoolIndex: Map<string, Set<string>>;                    // schoolId -> userIds
  schoolRoleIndex: Map<string, Map<string, Set<string>>>;   // schoolId -> role -> userIds
  classIndex: Map<string, Set<string>>;                     // classId -> userIds
  
  // Connection management
  addConnection(userId: string, socket: Socket, metadata?: UserMetadata): void;
  removeConnection(userId: string, socketId: string): void;
  
  // Getters
  getUserSockets(userId: string): Socket[];
  getUserMetadata(userId: string): UserMetadata | null;
  isUserOnline(userId: string): boolean;
  getOnlineUserCount(): number;
  getOnlineUserIds(): string[];
  
  // Query by criteria
  getUsersBySchool(schoolId: string): string[];
  getUsersBySchoolAndRole(schoolId: string, role: string): string[];
  getUsersByClass(classId: string): string[];
  getUsersByFilters(filters: UserFilters): string[];
  
  // Emit methods
  emitToUser(userId: string, event: string, data: any): void;
  emitToSchool(schoolId: string, event: string, data: any): void;
  emitToSchoolRole(schoolId: string, role: string, event: string, data: any): void;
  emitToClass(classId: string, event: string, data: any): void;
  emitToFiltered(filters: UserFilters, event: string, data: any): void;
}
```

### In `socket/handlers/types/message.types.ts`:

**Adding message handler types:**
```typescript
/**
 * Message handler type definitions
 */

export interface MessageSendPayload {
  recipientId: string;
  content: string;
  tempId?: string;
}

export interface Message {
  id: string;
  tempId?: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface MessageDeliveredPayload {
  messageId: string;
  tempId?: string;
  timestamp: string;
  recipientOnline: boolean;
}

export interface MessageReadPayload {
  messageId: string;
  senderId: string;
}

export interface MessageReadConfirmation {
  messageId: string;
  readBy: string;
  readAt: string;
}

export interface MessageUpdatePayload {
  messageId: string;
  content: string;
  recipientId: string;
}

export interface MessageDeletePayload {
  messageId: string;
  recipientId: string;
}

export interface MessageErrorPayload {
  error: string;
  messageId?: string;
  tempId?: string;
}
```

### In `socket/handlers/types/typing.types.ts`:

**Adding typing handler types:**
```typescript
/**
 * Typing indicator handler type definitions
 */

export interface TypingStartPayload {
  recipientId: string;
}

export interface TypingStopPayload {
  recipientId: string;
}

export interface TypingIndicatorData {
  userId: string;
  timestamp: string;
}
```

### In `socket/handlers/types/presence.types.ts`:

**Adding presence handler types:**
```typescript
/**
 * User presence handler type definitions
 */

export interface UserOnlinePayload {
  userId: string;
  timestamp: string;
}

export interface UserOfflinePayload {
  userId: string;
  timestamp: string;
}
```

## Dependencies

- [+] `socket.io` (Package) - Socket.IO types

## File Organization Benefits

- **Modular:** Each handler has its own type definitions
- **Maintainable:** Easy to find and update handler-specific types
- **Scalable:** New handlers can add their types without cluttering core types
- **Clear imports:** Handlers import only the types they need

---

[← Back to API Design Overview](../3-api-design.md)

