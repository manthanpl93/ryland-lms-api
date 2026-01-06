# School-Aware Broadcasting - Phase 1 Additions

## Summary

This document outlines the additions to Phase 1 for school-aware and role-based presence broadcasting with optimized multi-index connection management.

## Multi-Index Connection Manager Structure

```javascript
class ConnectionManager {
  constructor() {
    // Primary index
    this.userConnections = new Map(); // userId -> Array of connection objects
    
    // Secondary indexes for O(1) filtering
    this.schoolIndex = new Map(); // schoolId -> Set<userId>
    this.schoolRoleIndex = new Map(); // 'schoolId:role' -> Set<userId>
    this.classIndex = new Map(); // classId -> Set<userId>
  }
}
```

## Connection Object Structure

```javascript
{
  userId: string,
  socket: Socket,
  metadata: {
    userRole: 'teacher' | 'student' | 'admin',
    schoolId: string,
    classIds: string[]
  },
  connectedAt: Date
}
```

## Broadcasting Rules

**Student online/offline → Broadcasts to:**
- Teachers who teach ANY of the student's classes (same school)
- Students in the SAME classes only (same school)

**Teacher online/offline → Broadcasts to:**
- All other teachers (school-wide)
- All students in classes they teach

**Admin online/offline → Broadcasts to:**
- All users in their school (teachers, students, admins)

## New Connection Manager Methods

### Core Index Management

```javascript
addConnection(userId, socket, metadata) {
  // Adds to primary index
  // Updates schoolIndex
  // Updates schoolRoleIndex
  // Updates classIndex for each class
}

removeConnection(userId, socketId) {
  // Removes from primary index
  // Cleans up all secondary indexes if last connection
}
```

### Optimized Query Methods (Using Secondary Indexes)

```javascript
getOnlineUsersBySchool(schoolId) {
  // O(1) lookup via schoolIndex
  // Returns: Array of {userId, userRole, schoolId, classIds, sockets}
}

getOnlineUsersBySchoolAndRole(schoolId, role) {
  // O(1) lookup via schoolRoleIndex.get(`${schoolId}:${role}`)
  // Returns: Array of {userId, userRole, schoolId, classIds, sockets}
}

getOnlineUsersByClass(classId) {
  // O(1) lookup via classIndex
  // Returns: Array of {userId, userRole, schoolId, classIds, sockets}
}

getOnlineTeachersForClasses(classIds) {
  // O(k) where k = number of classes
  // Uses classIndex for each class, filters by role='teacher'
  // Returns: Array of {userId, userRole, schoolId, classIds, sockets}
}

getOnlineStudentsInClasses(classIds) {
  // O(k) where k = number of classes
  // Uses classIndex for each class, filters by role='student'
  // Returns: Array of {userId, userRole, schoolId, classIds, sockets}
}

getBroadcastTargetsForUser(userId) {
  // Determines broadcast targets based on user's role
  // Returns: Array of userIds who should receive presence updates
}

emitToUser(userId, event, data) {
  // CRITICAL: Checks socket.connected before emitting
  // Removes stale connections automatically
}
```

## Connection Flow with Class Queries

```javascript
io.on('connection', async (socket) => {
  const user = socket.user; // From JWT
  
  // Query classIds based on role
  let classIds = [];
  
  if (user.role === 'teacher') {
    const teacherClasses = await app.service('class-teachers').find({
      query: {
        teacherId: user._id,
        isActive: true,
        $select: ['classId']
      },
      paginate: false
    });
    classIds = teacherClasses.map(tc => tc.classId.toString());
    
  } else if (user.role === 'student') {
    const enrollments = await app.service('class-enrollments').find({
      query: {
        studentId: user._id,
        status: 'Active',
        $select: ['classId']
      },
      paginate: false
    });
    classIds = enrollments.map(e => e.classId.toString());
  }
  
  // Add connection with metadata (updates all indexes)
  connectionManager.addConnection(user._id, socket, {
    userRole: user.role,
    schoolId: user.schoolId,
    classIds: classIds
  });
  
  // Get broadcast targets based on role
  const targets = connectionManager.getBroadcastTargetsForUser(user._id);
  
  // Broadcast online status to relevant users only
  targets.forEach(targetUserId => {
    connectionManager.emitToUser(targetUserId, 'user:online', {
      userId: user._id,
      userRole: user.role,
      timestamp: new Date()
    });
  });
});
```

## Performance Improvements

**Before (O(n) iterations):**
- getOnlineUsersBySchool: O(n) where n = all connected users
- getOnlineUsersBySchoolAndRole: O(n)
- getOnlineUsersByClass: O(n)

**After (O(1) index lookups):**
- getOnlineUsersBySchool: O(1) + O(m) where m = users in that school
- getOnlineUsersBySchoolAndRole: O(1) + O(m) where m = users with that role in school
- getOnlineUsersByClass: O(1) + O(m) where m = users in that class

## Files Updated in Phase 1 Documentation

1. **1-overview.md**
   - Updated Connection Manager deliverable
   - Added tasks for class queries and school-based filtering

2. **2-architecture.md**
   - Updated Socket Layer description
   - Added school-aware broadcasting architecture
   - Updated User Presence Flow diagram

3. **3-api-design.md**
   - Updated Changes Overview table
   - Updated ConnectionManager section with multi-index implementation
   - Added all new query methods

4. **4-implementation-steps.md**
   - To be updated with index management steps
   - To be updated with class query integration steps

5. **5-models-and-services.md**
   - To be updated with class query examples
   - To be updated with metadata structure documentation

## Estimated Additional Time

- Connection Manager multi-index implementation: +2.5 hrs
- Class query integration on connection: +1 hr
- Broadcast filtering logic (getBroadcastTargetsForUser): +2 hrs
- Documentation updates: +1 hr
- **Total additional: ~6.5 hours** (new Phase 1 total: 32.5 hours)

## Next Implementation Steps

1. Implement multi-index ConnectionManager class
2. Add class query logic to socket connection handler
3. Implement all filtering methods using secondary indexes
4. Implement getBroadcastTargetsForUser with role-based logic
5. Update emitToUser with connection validation
6. Test with different user roles and school scenarios

