/**
 * JWT authentication middleware for Socket.IO chat connections
 * @param {Application} app - Feathers application instance
 * @returns {Function} Socket.IO middleware function
 */
function authenticateSocket(app) {
  return async (socket, next) => {
    try {
      console.log(`Chat socket authentication attempt: ${socket.id}`);

      // Extract token from handshake
      const token = socket.handshake.query.token || socket.handshake.auth.token;

      if (!token) {
        console.log(`No token provided for socket: ${socket.id}`);
        return next(new Error("Authentication token required"));
      }

      // Verify token using Feathers authentication service
      const result = await app
        .service("authentication")
        .verifyAccessToken(token);

      if (!result || !result.sub) {
        console.log(`Invalid token for socket: ${socket.id}`);
        return next(new Error("Invalid authentication token"));
      }

      // Fetch user from database
      const user = await app.service("users").get(result.sub);

      if (!user) {
        console.log(`User not found for token sub: ${result.sub}`);
        return next(new Error("User not found"));
      }

      // Attach user to socket
      socket.user = {
        _id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
        schoolId: user.schoolId ? user.schoolId.toString() : null,
      };

      console.log(
        `Chat socket authenticated: ${socket.id} (User: ${user._id})`
      );
      next();
    } catch (error) {
      console.error(`Chat socket authentication error: ${error.message}`);
      next(new Error("Authentication failed"));
    }
  };
}

module.exports = authenticateSocket;
