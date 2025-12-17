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
    this.schoolIndex = new Map(); // schoolId -> Set<userId>
    this.schoolRoleIndex = new Map(); // schoolId -> Map<role, Set<userId>>
    this.classIndex = new Map(); // classId -> Set<userId>
  }

  /**
   * Add a socket connection for a user with metadata
   * @param {string} userId - User ID
   * @param {Socket} socket - Socket instance
   * @param {Object} metadata - User metadata { userRole, schoolId, classIds[] }
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
      userRole: metadata.userRole,
      schoolId: metadata.schoolId,
      classIds: metadata.classIds || [],
    });

    // Add to secondary indexes
    const { userRole, schoolId, classIds } = metadata;

    // School index
    if (schoolId) {
      if (!this.schoolIndex.has(schoolId)) {
        this.schoolIndex.set(schoolId, new Set());
      }
      this.schoolIndex.get(schoolId).add(userId);

      // School-role index (nested: schoolId -> role -> userIds)
      if (userRole) {
        if (!this.schoolRoleIndex.has(schoolId)) {
          this.schoolRoleIndex.set(schoolId, new Map());
        }
        const rolesMap = this.schoolRoleIndex.get(schoolId);
        if (!rolesMap.has(userRole)) {
          rolesMap.set(userRole, new Set());
        }
        rolesMap.get(userRole).add(userId);
      }
    }

    // Class index
    if (classIds && Array.isArray(classIds)) {
      classIds.forEach((classId) => {
        if (!this.classIndex.has(classId)) {
          this.classIndex.set(classId, new Set());
        }
        this.classIndex.get(classId).add(userId);
      });
    }

    console.log(
      `Connection added for user ${userId} (${userRole}). Total: ${sockets.length}`
    );
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
    const filtered = sockets.filter((s) => s.id !== socketId);

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
      console.log(
        `Connection removed for user ${userId}. Remaining: ${filtered.length}`
      );
    }
  }

  /**
   * Remove user from all secondary indexes
   * @private
   */
  _removeFromIndexes(userId, metadata) {
    const { userRole, schoolId, classIds } = metadata;

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
      if (userRole) {
        const rolesMap = this.schoolRoleIndex.get(schoolId);
        if (rolesMap) {
          const roleUsers = rolesMap.get(userRole);
          if (roleUsers) {
            roleUsers.delete(userId);
            if (roleUsers.size === 0) {
              rolesMap.delete(userRole);
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
      classIds.forEach((classId) => {
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
      resultSet = new Set([...resultSet].filter((id) => schoolUsers.has(id)));
    }

    if (role && schoolId && classId) {
      const roleUsers = new Set(this.getUsersBySchoolAndRole(schoolId, role));
      resultSet = new Set([...resultSet].filter((id) => roleUsers.has(id)));
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
    sockets.forEach((socket) => {
      // Check if socket is still connected before emitting
      if (socket.connected) {
        socket.emit(event, data);
      }
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
    userIds.forEach((userId) => {
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
    userIds.forEach((userId) => {
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
    userIds.forEach((userId) => {
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
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }

  /**
   * Get broadcast targets for a user based on their role
   * @param {string} userId - User ID
   * @returns {string[]} Array of user IDs who should receive presence updates
   */
  getBroadcastTargetsForUser(userId) {
    const metadata = this.getUserMetadata(userId);
    if (!metadata) return [];

    const { userRole, schoolId, classIds } = metadata;
    const targets = new Set();

    if (userRole === "admin") {
      // Admins broadcast to all users in their school
      const schoolUsers = this.getUsersBySchool(schoolId);
      schoolUsers.forEach((id) => targets.add(id));
    } else if (userRole === "teacher") {
      // Teachers broadcast to all other teachers and students in their classes
      const teachers = this.getUsersBySchoolAndRole(schoolId, "teacher");
      teachers.forEach((id) => {
        if (id !== userId) targets.add(id);
      });

      // Add students from all teacher's classes
      if (classIds && classIds.length > 0) {
        classIds.forEach((classId) => {
          const students = this.getUsersByClass(classId);
          students.forEach((studentId) => {
            const studentMeta = this.getUserMetadata(studentId);
            if (studentMeta && studentMeta.userRole === "student") {
              targets.add(studentId);
            }
          });
        });
      }
    } else if (userRole === "student") {
      // Students broadcast to teachers of their classes and other students in same classes
      if (classIds && classIds.length > 0) {
        classIds.forEach((classId) => {
          const classUsers = this.getUsersByClass(classId);
          classUsers.forEach((classUserId) => {
            if (classUserId !== userId) {
              const meta = this.getUserMetadata(classUserId);
              if (meta) {
                // Add teachers or other students in the same class
                if (
                  meta.userRole === "teacher" ||
                  meta.userRole === "student"
                ) {
                  targets.add(classUserId);
                }
              }
            }
          });
        });
      }
    }

    return Array.from(targets);
  }
}

// Export singleton instance
module.exports = new ConnectionManager();
