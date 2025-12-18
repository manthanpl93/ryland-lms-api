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
  // Get models from app
  const Message = io.app.service("messages").Model;
  const Conversation = io.app.service("conversations").Model;
  /**
   * Handle message:send event
   * Client sends a new message
   */
  socket.on(MESSAGE.SEND, async (data) => {
    try {
      const { recipientId, content, tempId, conversationId } = data;
      console.log("Message Send Event:", data);
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
      const allOnlineUsers = connectionManager.getOnlineUserIds();
      const onlineCount = connectionManager.getOnlineUserCount();
      console.log(
        `🔍 Recipient online status: ${recipientOnline} (Recipient ID: ${recipientId})`
      );
      console.log(`👥 Total online users: ${onlineCount}`);
      console.log(`📋 All online user IDs:`, allOnlineUsers);

      // Find or create conversation
      let conversation;
      if (conversationId) {
        try {
          conversation = await Conversation.findById(conversationId);
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

      // ✅ PERSIST TO DATABASE using Model directly
      const savedMessage = await Message.create({
        conversationId: conversation._id,
        senderId: socket.user._id,
        recipientId,
        content: content.trim(),
        status: {
          delivered: false,
          read: false,
        },
      });
      console.log("Saved Message:", savedMessage);

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: {
          content: content.trim(),
          senderId: socket.user._id,
          timestamp: savedMessage.createdAt,
        },
        lastMessageAt: savedMessage.createdAt,
        $inc: {
          [`unreadCount.${recipientId}`]: 1,
        },
      });

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
        senderName: `${socket.user.firstName} ${socket.user.lastName}`,
        senderAvatar: socket.user.avatar,
      };

      console.log(
        `Message sent: ${socket.user._id} -> ${recipientId} (DB ID: ${message.id})`
      );

      // Send to recipient if online
      if (recipientOnline) {
        console.log(`📤 Emitting message:receive to recipient ${recipientId}`, {
          messageId: message.id,
          conversationId: message.conversationId,
        });
        connectionManager.emitToUser(recipientId, MESSAGE.RECEIVE, message);

        // Mark as delivered in database if recipient is online
        await Message.findByIdAndUpdate(savedMessage._id, {
          "status.delivered": true,
          "status.deliveredAt": new Date(),
        });
        console.log(`✅ Message marked as delivered in database`);
      } else {
        console.log(
          `⚠️ Recipient ${recipientId} is offline - message not sent via socket`
        );
      }

      // Confirm delivery to sender (sender already has optimistic message)
      // This will update the optimistic message with real ID and mark as delivered
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
      await Message.findByIdAndUpdate(messageId, {
        "status.read": true,
        "status.readAt": new Date(),
      });

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

      // Get the original message first
      const originalMessage = await Message.findById(messageId);
      if (!originalMessage) {
        socket.emit(MESSAGE.ERROR, {
          error: "Message not found",
          messageId,
        });
        return;
      }

      // ✅ PERSIST TO DATABASE - Update message content
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
          originalContent:
            originalMessage.originalContent || originalMessage.content,
        },
        { new: true }
      );

      const updateData = {
        messageId,
        content: updatedMessage.content,
        updatedAt: updatedMessage.editedAt.toISOString(),
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
      const deletedAt = new Date();
      await Message.findByIdAndUpdate(messageId, {
        isDeleted: true,
        deletedAt: deletedAt,
        deletedBy: socket.user._id,
      });

      const deleteData = {
        messageId,
        deletedAt: deletedAt.toISOString(),
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
