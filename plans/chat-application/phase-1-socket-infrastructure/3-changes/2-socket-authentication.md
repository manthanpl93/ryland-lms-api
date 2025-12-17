# Change 2: Middleware - authenticateSocket

**Type:** Middleware  
**Location:** `socket/auth.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

JWT authentication middleware for Socket.IO connections. Verifies the access token provided during socket handshake, extracts user information, and attaches it to the socket instance for use in event handlers.

## Affected Files

```
src/
├── socket/
│   └── [+] auth.js ──→ JWT authentication middleware
│
└── [~] app.ts ──→ Reuse existing authentication service
```

**Legend:** [+] New, [~] Modified

## Logic/Implementation

### Logical Block 1: Token Extraction

**What it does:**
Extracts JWT token from socket handshake query parameters.

**Why added/changed:**
Clients need to provide authentication when connecting to socket server.

**Implementation approach:**
```javascript
// Extract token from handshake
const token = socket.handshake.query.token || socket.handshake.auth.token;

if (!token) {
  return next(new Error('Authentication token required'));
}
```

### Logical Block 2: Token Verification

**What it does:**
Verifies the JWT token using the existing Feathers authentication service.

**Why added/changed:**
Reuse existing JWT verification logic to maintain consistency with REST API authentication.

**Implementation approach:**
```javascript
// Verify token using Feathers authentication
const result = await app.service('authentication').verifyAccessToken(token);

if (!result || !result.sub) {
  return next(new Error('Invalid authentication token'));
}

// Fetch user data
const user = await app.service('users').get(result.sub);
socket.user = user;
```

## Code Changes

### In `socket/auth.js`:

**Adding authentication middleware:**
```javascript
/**
 * JWT authentication middleware for Socket.IO
 * @param {Application} app - Feathers application instance
 * @returns {Function} Socket.IO middleware function
 */
function authenticateSocket(app) {
  return async (socket, next) => {
    try {
      console.log(`Socket authentication attempt: ${socket.id}`);
      
      // Extract token from handshake
      const token = socket.handshake.query.token || socket.handshake.auth.token;
      
      if (!token) {
        console.log(`No token provided for socket: ${socket.id}`);
        return next(new Error('Authentication token required'));
      }
      
      // Verify token using Feathers authentication service
      const result = await app.service('authentication').verifyAccessToken(token);
      
      if (!result || !result.sub) {
        console.log(`Invalid token for socket: ${socket.id}`);
        return next(new Error('Invalid authentication token'));
      }
      
      // Fetch user from database
      const user = await app.service('users').get(result.sub);
      
      if (!user) {
        console.log(`User not found for token sub: ${result.sub}`);
        return next(new Error('User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        _id: user._id.toString(),
        email: user.email,
        role: user.role || 'user'
      };
      
      console.log(`Socket authenticated: ${socket.id} (User: ${user._id})`);
      next();
      
    } catch (error) {
      console.error(`Socket authentication error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  };
}

module.exports = authenticateSocket;
```

## Dependencies

- [~] `authentication` (Service) - JWT verification
- [~] `users` (Service) - User lookup

## Models & Types

```typescript
// Socket handshake with token
interface SocketHandshake {
  query: {
    token?: string;
  };
  auth: {
    token?: string;
  };
}

// Authenticated user attached to socket
interface SocketUser {
  _id: string;
  email: string;
  role: string;
}
```

## Error Codes

**Common Errors:**
- **401 NotAuthenticated:** `'Authentication token required'` - No token provided
- **401 NotAuthenticated:** `'Invalid authentication token'` - Token verification failed
- **404 NotFound:** `'User not found'` - User doesn't exist in database
- **500 GeneralError:** `'Authentication failed'` - Generic auth error

---

[← Back to API Design Overview](../3-api-design.md)

