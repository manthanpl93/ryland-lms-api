const { EVENT_GROUPS } = require("../constants/events");
const { findOrCreateConversation } = require("../helpers/conversationHelper");

const { MESSAGE } = EVENT_GROUPS;

/**
 * Message event handler
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Client socket
 * @param {ConnectionManager} connectionManager - Connection manager
 */
function messageHandler(io, socket, connectionManager) {
  /**
   * Handle message:send event
   * Client sends a new message
   */
  socket.on(MESSAGE.SEND, async (data) => {
    try {
      const { recipientId, content, tempId, conversationId } = data;

      // Validate input
      if (!recipientId || !content) {
        socket.emit(MESSAGE.ERROR, {
          error: "Missing required fields: recipientId and content",
          tempId,
        });
        return;
      }

      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);

      // Find or create conversation
      let conversation;
      if (conversationId) {
        try {
          conversation = await io.app
            .service("conversations")
            .get(conversationId, {
              user: socket.user,
            });
        } catch (error) {
          console.error("Error getting conversation:", error);
        }
      }

      if (!conversation) {
        conversation = await findOrCreateConversation(
          io.app,
          socket.user._id,
          recipientId
        );
      }

      // ✅ PERSIST TO DATABASE using Messages Service
      const savedMessage = await io.app.service("messages").create(
        {
          conversationId: conversation._id.toString(),
          recipientId,
          content: content.trim(),
        },
        {
          user: socket.user, // Pass authenticated user context
        }
      );

      // Create socket message object from saved message
      const message = {
        id: savedMessage._id.toString(),
        tempId, // Client's temporary ID for optimistic updates
        from: socket.user._id,
        to: recipientId,
        content: savedMessage.content,
        timestamp: savedMessage.createdAt,
        status: "sent",
        conversationId: conversation._id.toString(),
      };

      console.log(
        `Message sent: ${socket.user._id} -> ${recipientId} (DB ID: ${message.id})`
      );

      // Send to recipient if online
      if (recipientOnline) {
        connectionManager.emitToUser(recipientId, MESSAGE.RECEIVE, message);

        // Mark as delivered in database if recipient is online
        await io.app.service("messages").patch(savedMessage._id, {
          markAsDelivered: true,
        });
      }

      // Confirm delivery to sender
      socket.emit(MESSAGE.DELIVERED, {
        messageId: message.id,
        tempId: message.tempId,
        timestamp: message.timestamp,
        recipientOnline,
        conversationId: message.conversationId,
      });
    } catch (error) {
      console.error("Error handling message:send:", error);
      socket.emit(MESSAGE.ERROR, {
        error: "Failed to send message",
        tempId: data.tempId,
        details: error.message,
      });
    }
  });

  /**
   * Handle message:read event
   * Client marks message as read
   */
  socket.on(MESSAGE.READ, async (data) => {
    try {
      const { messageId, senderId } = data;

      if (!messageId || !senderId) {
        return;
      }

      console.log(`Message read: ${messageId} by ${socket.user._id}`);

      // ✅ PERSIST TO DATABASE - Mark message as read
      await io.app.service("messages").patch(
        messageId,
        {
          markAsRead: true,
        },
        {
          user: socket.user,
        }
      );

      const readData = {
        messageId,
        readBy: socket.user._id,
        readAt: new Date().toISOString(),
      };

      // Notify sender via socket
      connectionManager.emitToUser(senderId, MESSAGE.READ, readData);
    } catch (error) {
      console.error("Error handling message:read:", error);
    }
  });

  /**
   * Handle message:update event
   * Client updates existing message
   */
  socket.on(MESSAGE.UPDATE, async (data) => {
    try {
      const { messageId, content, recipientId } = data;

      if (!messageId || !content || !recipientId) {
        socket.emit(MESSAGE.ERROR, {
          error: "Missing required fields",
          messageId,
        });
        return;
      }

      console.log(`Message updated: ${messageId}`);

      // ✅ PERSIST TO DATABASE - Update message content
      const updatedMessage = await io.app.service("messages").patch(
        messageId,
        {
          content: content.trim(),
        },
        {
          user: socket.user,
        }
      );

      const updateData = {
        messageId,
        content: updatedMessage.content,
        updatedAt: updatedMessage.editedAt || new Date().toISOString(),
        updatedBy: socket.user._id,
        isEdited: updatedMessage.isEdited,
      };

      // Broadcast to recipient via socket
      connectionManager.emitToUser(recipientId, MESSAGE.UPDATE, updateData);

      // Confirm to sender
      socket.emit(MESSAGE.UPDATE, updateData);
    } catch (error) {
      console.error("Error handling message:update:", error);
      socket.emit(MESSAGE.ERROR, {
        error: "Failed to update message",
        messageId: data.messageId,
        details: error.message,
      });
    }
  });

  /**
   * Handle message:delete event
   * Client deletes message
   */
  socket.on(MESSAGE.DELETE, async (data) => {
    try {
      const { messageId, recipientId } = data;

      if (!messageId || !recipientId) {
        socket.emit(MESSAGE.ERROR, {
          error: "Missing required fields",
          messageId,
        });
        return;
      }

      console.log(`Message deleted: ${messageId}`);

      // ✅ PERSIST TO DATABASE - Soft delete message
      const deletedMessage = await io.app
        .service("messages")
        .remove(messageId, {
          user: socket.user,
        });

      const deleteData = {
        messageId,
        deletedAt: deletedMessage.deletedAt || new Date().toISOString(),
        deletedBy: socket.user._id,
      };

      // Broadcast to recipient via socket
      connectionManager.emitToUser(recipientId, MESSAGE.DELETE, deleteData);

      // Confirm to sender
      socket.emit(MESSAGE.DELETE, deleteData);
    } catch (error) {
      console.error("Error handling message:delete:", error);
      socket.emit(MESSAGE.ERROR, {
        error: "Failed to delete message",
        messageId: data.messageId,
        details: error.message,
      });
    }
  });
}

module.exports = messageHandler;
