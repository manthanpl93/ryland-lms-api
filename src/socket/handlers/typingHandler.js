const { EVENT_GROUPS } = require("../constants/events");

const { TYPING } = EVENT_GROUPS;

/**
 * Typing indicator event handler
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Client socket
 * @param {ConnectionManager} connectionManager - Connection manager
 */
function typingHandler(io, socket, connectionManager) {
  /**
   * Handle typing:start event
   * User started typing
   */
  socket.on(TYPING.START, (data) => {
    try {
      const { recipientId, conversationId } = data;

      if (!recipientId) {
        return;
      }

      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);

      if (recipientOnline) {
        // Notify recipient with conversationId
        connectionManager.emitToUser(recipientId, TYPING.START, {
          userId: socket.user._id,
          conversationId: conversationId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Error handling typing:start
    }
  });

  /**
   * Handle typing:stop event
   * User stopped typing
   */
  socket.on(TYPING.STOP, (data) => {
    try {
      const { recipientId, conversationId } = data;

      if (!recipientId) {
        return;
      }

      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);

      if (recipientOnline) {
        // Notify recipient with conversationId
        connectionManager.emitToUser(recipientId, TYPING.STOP, {
          userId: socket.user._id,
          conversationId: conversationId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Error handling typing:stop
    }
  });
}

module.exports = typingHandler;
