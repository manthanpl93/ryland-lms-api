const { Server } = require("socket.io");
const authenticateSocket = require("./chatAuth");
const connectionManager = require("./connectionManager");
const messageHandler = require("./handlers/messageHandler");
const typingHandler = require("./handlers/typingHandler");
const { EVENT_GROUPS } = require("./constants/events");

/**
 * Initialize Socket.IO server for chat functionality
 * @param {Application} app - Feathers application instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocketServer(app) {
  const httpServer = app.get("server");

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
    maxHttpBufferSize: 1e8, // 100MB
    transports: ["websocket", "polling"],
    path: "/chat-socket/", // Different path from AI quiz socket (/socket.io/)
  });

  // Store app reference in io for handlers to access services
  io.app = app;

  // Apply authentication middleware
  io.use(authenticateSocket(app));

  // Connection handler
  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`Chat: User connected: ${user._id} (Socket: ${socket.id})`);

    try {
      // Query classIds based on role
      let classIds = [];

      // Normalize role to lowercase for comparison
      const userRoleLower = (user.role || "").toLowerCase();
      console.log(
        `Chat: User ${user._id} role: "${user.role}" (normalized: "${userRoleLower}")`
      );

      if (userRoleLower === "teacher") {
        console.log(`Chat: Querying teacher classes for user ${user._id}`);
        const teacherClasses = await app.service("class-teachers").find({
          query: {
            teacherId: user._id,
            isActive: true,
            $select: ["classId"],
          },
          paginate: false,
        });
        classIds = teacherClasses.map((tc) => tc.classId.toString());
        console.log(
          `Chat: Found ${classIds.length} classes for teacher ${user._id}`
        );
      } else if (userRoleLower === "student") {
        console.log(`Chat: Querying student enrollments for user ${user._id}`);
        const enrollments = await app.service("class-enrollments").find({
          query: {
            studentId: user._id,
            status: "Active",
            $select: ["classId"],
          },
          paginate: false,
        });
        classIds = enrollments.map((e) => e.classId.toString());
        console.log(
          `Chat: Found ${classIds.length} classes for student ${user._id}`
        );
      } else {
        console.log(
          `Chat: Role "${user.role}" is not teacher or student - no classes to query`
        );
      }

      // Add connection with metadata (updates all indexes)
      connectionManager.addConnection(user._id, socket, {
        userRole: user.role,
        schoolId: user.schoolId,
        classIds: classIds,
      });

      // Get broadcast targets based on role
      const targets = connectionManager.getBroadcastTargetsForUser(user._id);

      // Broadcast online status to relevant users only
      targets.forEach((targetUserId) => {
        connectionManager.emitToUser(targetUserId, EVENT_GROUPS.USER.ONLINE, {
          userId: user._id,
          userRole: user.role,
          timestamp: new Date().toISOString(),
        });
      });

      // Register event handlers
      messageHandler(io, socket, connectionManager);
      typingHandler(io, socket, connectionManager);

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(
          `Chat: User disconnected: ${user._id} (Socket: ${socket.id})`
        );

        // Check if this was the last connection
        const wasLastConnection =
          connectionManager.getUserSockets(user._id).length === 1;

        connectionManager.removeConnection(user._id, socket.id);

        // Broadcast user offline status if no more connections
        if (wasLastConnection) {
          const targets = connectionManager.getBroadcastTargetsForUser(
            user._id
          );
          targets.forEach((targetUserId) => {
            connectionManager.emitToUser(
              targetUserId,
              EVENT_GROUPS.USER.OFFLINE,
              {
                userId: user._id,
                timestamp: new Date().toISOString(),
              }
            );
          });
        }
      });
    } catch (error) {
      console.error(
        `Error during chat socket connection setup: ${error.message}`
      );
      socket.disconnect();
    }
  });

  console.log("✅ Socket.IO chat server initialized");
  return io;
}

module.exports = initializeSocketServer;
