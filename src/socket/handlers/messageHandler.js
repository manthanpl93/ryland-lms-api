const { EVENT_GROUPS } = require("../constants/events");
const { findOrCreateConversation } = require("../helpers/conversationHelper");
// Temporarily disabled due to missing dependencies
// const {
//   processImageAttachments,
//   extractLinkPreviews,
//   validateAttachment,
//   createConversationAttachments
// } = require("../helpers/attachmentHelper");

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
      const { recipientId, content, tempId, conversationId, attachments } = data;
      console.log("Message Send Event:", data);
      // Validate input
      if (!recipientId || !content) {
        socket.emit(MESSAGE.ERROR, {
          error: "Missing required fields: recipientId and content",
          tempId,
        });
        return;
      }

      // Validate attachments if provided
      let validatedAttachments = [];
      if (attachments && Array.isArray(attachments)) {
        for (const attachment of attachments) {
          if (!validateAttachment(attachment)) {
            socket.emit(MESSAGE.ERROR, {
              error: "Invalid attachment structure",
              tempId,
            });
            return;
          }
        }
        validatedAttachments = attachments;
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

      // Process image attachments (generate thumbnails)
      const processedAttachments = await processImageAttachments(
        validatedAttachments,
        io.app,
        socket.user
      );

      // Extract link previews from content if no link attachments provided
      const linkAttachments = await extractLinkPreviews(content, processedAttachments);
      
      // Combine all attachments
      const allAttachments = [...processedAttachments, ...linkAttachments];

      // ✅ PERSIST TO DATABASE using Model directly
      const messageData = {
        conversationId: conversation._id,
        senderId: socket.user._id,
        recipientId,
        content: content.trim(),
        status: {
          delivered: false,
          read: false,
        },
      };

      // Add attachments if any
      if (allAttachments.length > 0) {
        messageData.attachments = allAttachments;
      }

      const savedMessage = await Message.create(messageData);
      console.log("Saved Message:", savedMessage);

      // Create conversation-attachments records
      if (savedMessage.attachments && savedMessage.attachments.length > 0) {
        await createConversationAttachments(
          savedMessage.attachments,
          conversation._id.toString(),
          savedMessage._id.toString(),
          socket.user._id.toString(),
          io.app
        );
      }

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
        attachments: savedMessage.attachments || [],
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
        attachments: savedMessage.attachments || [],
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
   * Handle message:reply event
   * Client sends a reply to an existing message
   * @param {MessageReplyPayload} data - Reply message payload
   */
  socket.on(MESSAGE.REPLY, async (data) => {
    try {
      const { recipientId, content, replyToMessageId, conversationId, tempId, attachments } = data;

      // Validate required fields
      if (!recipientId || !content || !replyToMessageId || !conversationId) {
        socket.emit(MESSAGE.ERROR, {
          error: "Missing required fields: recipientId, content, replyToMessageId, conversationId",
          tempId,
        });
        return;
      }

      // Validate attachments if provided
      let validatedAttachments = [];
      if (attachments && Array.isArray(attachments)) {
        for (const attachment of attachments) {
          if (!validateAttachment(attachment)) {
            socket.emit(MESSAGE.ERROR, {
              error: "Invalid attachment structure",
              tempId,
            });
            return;
          }
        }
        validatedAttachments = attachments;
      }

      // Check if recipient is online
      const recipientOnline = connectionManager.isUserOnline(recipientId);

      // Fetch the original message to get preview content
      const originalMessage = await Message.findById(replyToMessageId);
      if (!originalMessage) {
        socket.emit(MESSAGE.ERROR, {
          error: "Original message not found",
          tempId,
        });
        return;
      }

      // Validate that the original message is not deleted
      if (originalMessage.isDeleted) {
        socket.emit(MESSAGE.ERROR, {
          error: "Cannot reply to deleted message",
          tempId,
        });
        return;
      }

      // Verify user has access to the original message (same conversation)
      if (originalMessage.conversationId.toString() !== conversationId) {
        socket.emit(MESSAGE.ERROR, {
          error: "Cannot reply to message from different conversation",
          tempId,
        });
        return;
      }

      // Process image attachments (generate thumbnails)
      const processedAttachments = await processImageAttachments(
        validatedAttachments,
        io.app,
        socket.user
      );

      // Extract link previews from content if no link attachments provided
      const linkAttachments = await extractLinkPreviews(content, processedAttachments);
      
      // Combine all attachments
      const allAttachments = [...processedAttachments, ...linkAttachments];

      // ✅ PERSIST TO DATABASE using Model directly
      const messageData = {
        conversationId: conversationId,
        senderId: socket.user._id,
        recipientId,
        content: content.trim(),
        status: {
          delivered: false,
          read: false,
        },
        reply: {
          messageId: replyToMessageId,
          content: originalMessage.content.length > 200
            ? originalMessage.content.substring(0, 200) + "..."
            : originalMessage.content,
          messageType: 'text',
          senderId: originalMessage.senderId
        },
      };

      // Add attachments if any
      if (allAttachments.length > 0) {
        messageData.attachments = allAttachments;
      }

      const savedMessage = await Message.create(messageData);

      // Create conversation-attachments records
      if (savedMessage.attachments && savedMessage.attachments.length > 0) {
        await createConversationAttachments(
          savedMessage.attachments,
          conversationId,
          savedMessage._id.toString(),
          socket.user._id.toString(),
          io.app
        );
      }

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(conversationId, {
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
        conversationId: conversationId,
        reply: savedMessage.reply,
        attachments: savedMessage.attachments || [],
        senderName: `${socket.user.firstName} ${socket.user.lastName}`,
        senderAvatar: socket.user.avatar,
      };

      console.log(
        `Reply sent: ${socket.user._id} -> ${recipientId} (DB ID: ${message.id})`
      );

      // Send to recipient if online
      if (recipientOnline) {
        console.log(`📤 Emitting message:reply:receive to recipient ${recipientId}`);
        connectionManager.emitToUser(recipientId, MESSAGE.REPLY_RECEIVE, message);

        // Mark as delivered in database if recipient is online
        await Message.findByIdAndUpdate(savedMessage._id, {
          "status.delivered": true,
          "status.deliveredAt": new Date(),
        });
        console.log(`✅ Reply marked as delivered in database`);
      } else {
        console.log(
          `⚠️ Recipient ${recipientId} is offline - reply not sent via socket`
        );
      }

      // Confirm delivery to sender (sender already has optimistic message)
      socket.emit(MESSAGE.DELIVERED, {
        messageId: message.id,
        tempId: message.tempId,
        timestamp: message.timestamp,
        recipientOnline,
        conversationId: message.conversationId,
        attachments: savedMessage.attachments || [],
      });
    } catch (error) {
      console.error("Error handling message:reply:", error);
      socket.emit(MESSAGE.ERROR, {
        error: "Failed to send reply",
        tempId: data.tempId,
        details: error.message,
      });
    }
  });

  /**
   * Handle message:read event
   * Client opens conversation - mark all unread messages as read
   */
  socket.on(MESSAGE.READ, async (data) => {
    try {
      const { conversationId } = data;
      const readerId = socket.user._id;

      console.log(
        `📖 User ${readerId} marking messages as read in conversation ${conversationId}`
      );

      // Find ALL unread messages in this conversation for current user
      const unreadMessages = await Message.find({
        conversationId,
        recipientId: readerId,
        "status.read": false,
      });

      if (unreadMessages.length === 0) {
        console.log(
          `✅ No unread messages in conversation ${conversationId}`
        );
        return;
      }

      const messageIds = unreadMessages.map((m) => m._id);
      const now = new Date();

      console.log(
        `📝 Marking ${messageIds.length} messages as read in conversation ${conversationId}`
      );

      // Mark all unread messages as read (single batch operation)
      await Message.updateMany(
        { _id: { $in: messageIds } },
        {
        "status.read": true,
          "status.readAt": now,
        }
      );

      // Reset unreadCount to 0 for this user
      await Conversation.findByIdAndUpdate(conversationId, {
        [`unreadCount.${readerId}`]: 0,
      });

      console.log(
        `✅ Marked ${messageIds.length} messages as read in conversation ${conversationId}`
      );

      // Emit read confirmation to all unique senders (if online)
      const senderIds = [
        ...new Set(unreadMessages.map((m) => m.senderId.toString())),
      ];

      senderIds.forEach((senderId) => {
        if (senderId !== readerId.toString()) {
          console.log(
            `📤 Notifying sender ${senderId} about read confirmation`
          );
          connectionManager.emitToUser(senderId, MESSAGE.READ, {
            conversationId,
            messageIds: messageIds.map((id) => id.toString()),
            readBy: readerId,
            readAt: now.toISOString(),
          });
        }
      });
    } catch (error) {
      console.error("❌ Error handling message:read:", error);
      socket.emit(MESSAGE.ERROR, {
        error: "Failed to mark messages as read",
      });
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

      // ✅ SECURITY: Verify the message exists and belongs to the user
      const message = await Message.findById(messageId);
      
      if (!message) {
        socket.emit(MESSAGE.ERROR, {
          error: "Message not found",
          messageId,
        });
        return;
      }

      // ✅ SECURITY: Verify user owns the message
      if (message.senderId.toString() !== socket.user._id.toString()) {
        console.log(`❌ Unauthorized delete attempt: User ${socket.user._id} tried to delete message ${messageId} owned by ${message.senderId}`);
        socket.emit(MESSAGE.ERROR, {
          error: "Unauthorized: You can only delete your own messages",
          messageId,
        });
        return;
      }

      // ✅ SECURITY: Prevent deleting already deleted messages
      if (message.isDeleted) {
        socket.emit(MESSAGE.ERROR, {
          error: "Message already deleted",
          messageId,
        });
        return;
      }

      console.log(`Message deleted: ${messageId} by user ${socket.user._id}`);

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

  /**
   * Handle message:link-preview event
   * Client requests link preview before sending message
   */
  socket.on(MESSAGE.LINK_PREVIEW, async (data) => {
    try {
      const { url, tempId } = data;

      if (!url) {
        socket.emit(MESSAGE.LINK_PREVIEW_RESULT, {
          tempId,
          error: "URL is required",
        });
        return;
      }

      console.log(`Fetching link preview for: ${url}`);

      // Import fetchLinkPreview utility
      const { fetchLinkPreview } = require("../../utils/link-preview");

      // Fetch preview with timeout
      const preview = await fetchLinkPreview(url, 5000);

      // Send preview data back to client
      socket.emit(MESSAGE.LINK_PREVIEW_RESULT, {
        tempId,
        preview: {
          title: preview.title,
          description: preview.description,
          image: preview.image,
          siteName: preview.siteName,
          url: preview.url,
        },
      });

      console.log(`Link preview fetched successfully for: ${url}`);
    } catch (error) {
      console.error("Error fetching link preview:", error);
      socket.emit(MESSAGE.LINK_PREVIEW_RESULT, {
        tempId: data.tempId,
        error: error.message || "Failed to fetch link preview",
      });
    }
  });
}

module.exports = messageHandler;
