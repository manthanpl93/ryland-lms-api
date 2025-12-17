# Change 3: Function - ConnectionManager

**Type:** Function  
**Location:** `socket/connectionManager.js`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Manages user-to-socket mappings using a multi-index in-memory structure for O(1) lookups. Stores user metadata (role, schoolId, classIds) and maintains secondary indexes for filtering by school, role, and class. Supports multiple socket connections per user (e.g., mobile + web) and provides school-aware broadcasting capabilities.

## Affected Files

```
src/
└── socket/
    └── [+] connectionManager.js ──→ Connection management with Map
```

**Legend:** [+] New

## Logic/Implementation

### Logical Block 1: Connection Map Structure

**What it does:**
Maintains a Map where keys are user IDs and values are arrays of socket instances with user metadata.

**Why added/changed:**
Users can have multiple active connections (mobile, web, desktop), so we need to track all sockets per user along with their metadata for filtering.

**Implementation approach:**
```javascript
// Map structure: userId -> [socket1, socket2, ...]
const userSocketMap = new Map();

// Map structure: userId -> { role, schoolId, classIds[] }
const userMetadataMap = new Map();

// Add connection with metadata
if (!userSocketMap.has(userId)) {
  userSocketMap.set(userId, []);
}
userSocketMap.get(userId).push(socket);
userMetadataMap.set(userId, { role, schoolId, classIds });

// Get all sockets for user
const sockets = userSocketMap.get(userId) || [];
```

### Logical Block 2: Secondary Indexes

**What it does:**
Maintains secondary indexes for efficient filtering by school, role (scoped to school), and class.

**Why added/changed:**
Enable O(1) lookups for broadcasting to specific schools, roles within schools, or classes without iterating all users. Roles are scoped to schools since a user's role is contextual to their school.

**Implementation approach:**
```javascript
// School index: schoolId -> Set<userId>
const schoolIndex = new Map();

// School-scoped role index: schoolId -> role -> Set<userId>
const schoolRoleIndex = new Map();

// Class index: classId -> Set<userId>
const classIndex = new Map();

// Add to indexes
if (schoolId) {
  // Add to school index
  if (!schoolIndex.has(schoolId)) {
    schoolIndex.set(schoolId, new Set());
  }
  schoolIndex.get(schoolId).add(userId);
  
  // Add to school-role index
  if (role) {
    if (!schoolRoleIndex.has(schoolId)) {
      schoolRoleIndex.set(schoolId, new Map());
    }
    const rolesMap = schoolRoleIndex.get(schoolId);
    if (!rolesMap.has(role)) {
      rolesMap.set(role, new Set());
    }
    rolesMap.get(role).add(userId);
  }
}

// Query by school and role
const rolesMap = schoolRoleIndex.get(schoolId);
const userIdsWithRole = rolesMap ? rolesMap.get(role) || new Set() : new Set();
```

### Logical Block 3: Connection Cleanup

**What it does:**
Removes disconnected sockets from the map and cleans up empty entries and secondary indexes.

**Why added/changed:**
Prevent memory leaks by removing stale socket references and index entries when users disconnect.

**Implementation approach:**
```javascript
// Remove specific socket
const sockets = userSocketMap.get(userId) || [];
const filtered = sockets.filter(s => s.id !== socketId);

if (filtered.length === 0) {
  // Remove from primary map
  userSocketMap.delete(userId);
  
  // Get metadata for cleanup
  const metadata = userMetadataMap.get(userId);
  userMetadataMap.delete(userId);
  
  // Clean up secondary indexes
  if (metadata) {
    const { schoolId, role, classIds } = metadata;
    
    if (schoolId) {
      // Remove from school index
      const schoolUsers = schoolIndex.get(schoolId);
      if (schoolUsers) {
        schoolUsers.delete(userId);
        if (schoolUsers.size === 0) {
          schoolIndex.delete(schoolId);
        }
      }
      
      // Remove from school-role index
      if (role) {
        const rolesMap = schoolRoleIndex.get(schoolId);
        if (rolesMap) {
          const roleUsers = rolesMap.get(role);
          if (roleUsers) {
            roleUsers.delete(userId);
            if (roleUsers.size === 0) {
              rolesMap.delete(role);
            }
          }
          // Clean up school entry if no roles left
          if (rolesMap.size === 0) {
            schoolRoleIndex.delete(schoolId);
          }
        }
      }
    }
    
    // Remove from class indexes
    if (classIds && Array.isArray(classIds)) {
      classIds.forEach(classId => {
        const classUsers = classIndex.get(classId);
        if (classUsers) {
          classUsers.delete(userId);
          if (classUsers.size === 0) {
            classIndex.delete(classId);
          }
        }
      });
    }
  }
} else {
  userSocketMap.set(userId, filtered);
}
```

## Code Changes

### In `socket/connectionManager.js`:

**Adding connection manager:**
```javascript
/**
 * Connection Manager for tracking user-socket mappings
 * Supports multiple connections per user with secondary indexes for school, role, and class
 */
class ConnectionManager {
  constructor() {
    // Primary index: userId -> [socket1, socket2, ...]
    this.userSocketMap = new Map();
    
    // User metadata: userId -> { role, schoolId, classIds[] }
    this.userMetadataMap = new Map();
    
    // Secondary indexes for efficient filtering
    this.schoolIndex = new Map();     // schoolId -> Set<userId>
    this.schoolRoleIndex = new Map(); // schoolId -> role -> Set<userId>
    this.classIndex = new Map();      // classId -> Set<userId>
  }
  
  /**
   * Add a socket connection for a user with metadata
   * @param {string} userId - User ID
   * @param {Socket} socket - Socket instance
   * @param {Object} metadata - User metadata { role, schoolId, classIds[] }
   */
  addConnection(userId, socket, metadata = {}) {
    // Add to primary map
    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, []);
    }
    const sockets = this.userSocketMap.get(userId);
    sockets.push(socket);
    
    // Store/update metadata
    this.userMetadataMap.set(userId, {
      role: metadata.role,
      schoolId: metadata.schoolId,
      classIds: metadata.classIds || []
    });
    
    // Add to secondary indexes
    const { role, schoolId, classIds } = metadata;
    
    // School index
    if (schoolId) {
      if (!this.schoolIndex.has(schoolId)) {
        this.schoolIndex.set(schoolId, new Set());
      }
      this.schoolIndex.get(schoolId).add(userId);
      
      // School-role index (nested: schoolId -> role -> userIds)
      if (role) {
        if (!this.schoolRoleIndex.has(schoolId)) {
          this.schoolRoleIndex.set(schoolId, new Map());
        }
        const rolesMap = this.schoolRoleIndex.get(schoolId);
        if (!rolesMap.has(role)) {
          rolesMap.set(role, new Set());
        }
        rolesMap.get(role).add(userId);
      }
    }
    
    // Class index
    if (classIds && Array.isArray(classIds)) {
      classIds.forEach(classId => {
        if (!this.classIndex.has(classId)) {
          this.classIndex.set(classId, new Set());
        }
        this.classIndex.get(classId).add(userId);
      });
    }
    
    console.log(`Connection added for user ${userId} (${role}). Total: ${sockets.length}`);
  }
  
  /**
   * Remove a socket connection for a user
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID to remove
   */
  removeConnection(userId, socketId) {
    if (!this.userSocketMap.has(userId)) {
      return;
    }
    
    const sockets = this.userSocketMap.get(userId);
    const filtered = sockets.filter(s => s.id !== socketId);
    
    if (filtered.length === 0) {
      // User is now offline - clean up everything
      this.userSocketMap.delete(userId);
      
      // Get metadata for cleanup
      const metadata = this.userMetadataMap.get(userId);
      this.userMetadataMap.delete(userId);
      
      // Clean up secondary indexes
      if (metadata) {
        this._removeFromIndexes(userId, metadata);
      }
      
      console.log(`User ${userId} is now offline (no connections)`);
    } else {
      this.userSocketMap.set(userId, filtered);
      console.log(`Connection removed for user ${userId}. Remaining: ${filtered.length}`);
    }
  }
  
  /**
   * Remove user from all secondary indexes
   * @private
   */
  _removeFromIndexes(userId, metadata) {
    const { role, schoolId, classIds } = metadata;
    
    if (schoolId) {
      // Remove from school index
      const schoolUsers = this.schoolIndex.get(schoolId);
      if (schoolUsers) {
        schoolUsers.delete(userId);
        if (schoolUsers.size === 0) {
          this.schoolIndex.delete(schoolId);
        }
      }
      
      // Remove from school-role index
      if (role) {
        const rolesMap = this.schoolRoleIndex.get(schoolId);
        if (rolesMap) {
          const roleUsers = rolesMap.get(role);
          if (roleUsers) {
            roleUsers.delete(userId);
            if (roleUsers.size === 0) {
              rolesMap.delete(role);
            }
          }
          // Clean up school entry if no roles left
          if (rolesMap.size === 0) {
            this.schoolRoleIndex.delete(schoolId);
          }
        }
      }
    }
    
    // Remove from class indexes
    if (classIds && Array.isArray(classIds)) {
      classIds.forEach(classId => {
        const classUsers = this.classIndex.get(classId);
        if (classUsers) {
          classUsers.delete(userId);
          if (classUsers.size === 0) {
            this.classIndex.delete(classId);
          }
        }
      });
    }
  }
  
  /**
   * Get all socket connections for a user
   * @param {string} userId - User ID
   * @returns {Socket[]} Array of socket instances
   */
  getUserSockets(userId) {
    return this.userSocketMap.get(userId) || [];
  }
  
  /**
   * Get user metadata
   * @param {string} userId - User ID
   * @returns {Object|null} User metadata
   */
  getUserMetadata(userId) {
    return this.userMetadataMap.get(userId) || null;
  }
  
  /**
   * Check if user is online (has at least one connection)
   * @param {string} userId - User ID
   * @returns {boolean} True if user has active connections
   */
  isUserOnline(userId) {
    const sockets = this.getUserSockets(userId);
    return sockets.length > 0;
  }
  
  /**
   * Get total number of online users
   * @returns {number} Count of online users
   */
  getOnlineUserCount() {
    return this.userSocketMap.size;
  }
  
  /**
   * Get all online user IDs
   * @returns {string[]} Array of user IDs
   */
  getOnlineUserIds() {
    return Array.from(this.userSocketMap.keys());
  }
  
  /**
   * Get online users in a specific school
   * @param {string} schoolId - School ID
   * @returns {string[]} Array of user IDs
   */
  getUsersBySchool(schoolId) {
    const userSet = this.schoolIndex.get(schoolId);
    return userSet ? Array.from(userSet) : [];
  }
  
  /**
   * Get online users with a specific role in a school
   * @param {string} schoolId - School ID
   * @param {string} role - User role (admin, teacher, student)
   * @returns {string[]} Array of user IDs
   */
  getUsersBySchoolAndRole(schoolId, role) {
    const rolesMap = this.schoolRoleIndex.get(schoolId);
    if (!rolesMap) return [];
    
    const userSet = rolesMap.get(role);
    return userSet ? Array.from(userSet) : [];
  }
  
  /**
   * Get online users in a specific class
   * @param {string} classId - Class ID
   * @returns {string[]} Array of user IDs
   */
  getUsersByClass(classId) {
    const userSet = this.classIndex.get(classId);
    return userSet ? Array.from(userSet) : [];
  }
  
  /**
   * Get online users matching multiple criteria
   * @param {Object} filters - { schoolId?, role?, classId? }
   * @returns {string[]} Array of user IDs
   */
  getUsersByFilters(filters = {}) {
    const { schoolId, role, classId } = filters;
    let resultSet = null;
    
    // Start with the most restrictive filter
    if (classId) {
      resultSet = new Set(this.getUsersByClass(classId));
    } else if (schoolId && role) {
      resultSet = new Set(this.getUsersBySchoolAndRole(schoolId, role));
    } else if (schoolId) {
      resultSet = new Set(this.getUsersBySchool(schoolId));
    } else {
      return this.getOnlineUserIds();
    }
    
    // Apply additional filters as intersections
    if (schoolId && !role && classId) {
      const schoolUsers = new Set(this.getUsersBySchool(schoolId));
      resultSet = new Set([...resultSet].filter(id => schoolUsers.has(id)));
    }
    
    if (role && schoolId && classId) {
      const roleUsers = new Set(this.getUsersBySchoolAndRole(schoolId, role));
      resultSet = new Set([...resultSet].filter(id => roleUsers.has(id)));
    }
    
    return Array.from(resultSet);
  }
  
  /**
   * Emit event to all sockets of a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToUser(userId, event, data) {
    const sockets = this.getUserSockets(userId);
    sockets.forEach(socket => {
      socket.emit(event, data);
    });
  }
  
  /**
   * Emit event to all users in a school
   * @param {string} schoolId - School ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToSchool(schoolId, event, data) {
    const userIds = this.getUsersBySchool(schoolId);
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
  
  /**
   * Emit event to all users with a specific role in a school
   * @param {string} schoolId - School ID
   * @param {string} role - User role
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToSchoolRole(schoolId, role, event, data) {
    const userIds = this.getUsersBySchoolAndRole(schoolId, role);
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
  
  /**
   * Emit event to all users in a class
   * @param {string} classId - Class ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToClass(classId, event, data) {
    const userIds = this.getUsersByClass(classId);
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
  
  /**
   * Emit event to users matching filters
   * @param {Object} filters - { schoolId?, role?, classId? }
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emitToFiltered(filters, event, data) {
    const userIds = this.getUsersByFilters(filters);
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
}

// Export singleton instance
module.exports = new ConnectionManager();
```

## Dependencies

- None (standalone module)

## Models & Types

```typescript
// User metadata stored with connections
interface UserMetadata {
  role: string;
  schoolId: string;
  classIds: string[];
}

// Filter criteria for querying users
interface UserFilters {
  schoolId?: string;
  role?: string;
  classId?: string;
}

// Connection manager interface
interface IConnectionManager {
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

## Error Codes

No specific errors - operations are safe and won't throw exceptions.

---

[← Back to API Design Overview](../3-api-design.md)

