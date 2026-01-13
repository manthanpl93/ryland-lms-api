const { EVENT_GROUPS } = require("../constants/events");

// Supported reaction types (defined inline to avoid TypeScript dependency)
const VALID_REACTION_TYPES = [
  "thumbs_up",
  "heart",
  "laugh",
  "surprised",
  "sad",
];

const { REACTION } = EVENT_GROUPS;

/**
 * Reaction event handler
 * @param io - Socket.IO server instance
 * @param socket - Client socket
 * @param connectionManager - Connection manager
 */
function reactionHandler(io, socket, connectionManager) {
  try {
    // Get models from app
    const Message = io.app.service("messages").Model;
    const Conversation = io.app.service("conversations").Model;

  /**
   * Handle reaction:add event
   * Client adds/changes a reaction to a message
   */
  socket.on(REACTION.ADD, async (data) => {
    try {
      const { messageId, reactionType } = data;
      const userId = socket.user._id;

      // Validate input
      if (!messageId || !reactionType) {
        socket.emit(REACTION.ERROR, {
          error: "Missing required fields: messageId and reactionType",
          messageId,
        });
        return;
      }

      // Validate reaction type
      if (!VALID_REACTION_TYPES.includes(reactionType)) {
        socket.emit(REACTION.ERROR, {
          error: `Invalid reaction type. Must be one of: ${VALID_REACTION_TYPES.join(
            ", "
          )}`,
          messageId,
        });
        return;
      }

      // Check if message exists and is not deleted
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit(REACTION.ERROR, {
          error: "Message not found",
          messageId,
        });
        return;
      }

      if (message.isDeleted) {
        socket.emit(REACTION.ERROR, {
          error: "Cannot react to deleted message",
          messageId,
        });
        return;
      }

      // Check if user is participant in conversation
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        socket.emit(REACTION.ERROR, {
          error: "Conversation not found",
          messageId,
        });
        return;
      }

      if (
        !conversation.participants.some(
          (p) => p.toString() === userId.toString()
        )
      ) {
        socket.emit(REACTION.ERROR, {
          error: "Not authorized to react to this message",
          messageId,
        });
        return;
      }

      // Find existing reaction by this user
      const existingReactionIndex =
        message.reactions?.findIndex(
          (reaction) => reaction.userId.toString() === userId.toString()
        ) ?? -1;

      const existingReaction =
        existingReactionIndex >= 0
          ? message.reactions[existingReactionIndex]
          : null;
      const currentReactionType = existingReaction?.reactionType;

      let updateOperation = {};
      let action = "added";

      if (existingReaction) {
        if (existingReaction.reactionType === reactionType) {
          // Toggle off (remove)
          updateOperation = {
            $pull: { reactions: { userId: userId } },
            $inc: {
              [`reactionCounts.${currentReactionType}`]: -1,
              "reactionCounts.total": -1,
            },
          };
          action = "toggled";
        } else {
          // Change reaction type
          updateOperation = {
            $set: {
              "reactions.$[reaction].reactionType": reactionType,
              "reactions.$[reaction].createdAt": new Date(),
            },
            $inc: {
              [`reactionCounts.${currentReactionType}`]: -1,
              [`reactionCounts.${reactionType}`]: 1,
            },
          };
          action = "changed";
        }
      } else {
        // Add new reaction
        updateOperation = {
          $push: {
            reactions: {
              userId: userId,
              reactionType: reactionType,
              createdAt: new Date(),
            },
          },
          $inc: {
            [`reactionCounts.${reactionType}`]: 1,
            "reactionCounts.total": 1,
          },
        };
      }

      // Apply the update
      let updateOptions = {};
      if (existingReaction && existingReaction.reactionType !== reactionType) {
        // Use array filter for changing existing reaction
        updateOptions.arrayFilters = [{ "reaction.userId": userId }];
      }

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        updateOperation,
        {
          new: true,
          ...updateOptions,
        }
      );

      // Broadcast to all conversation participants (including sender)
      const reactionData = {
        messageId: messageId,
        reactions: updatedMessage.reactions,
        reactionCounts: updatedMessage.reactionCounts,
        userId: userId,
        action: action,
      };

      conversation.participants.forEach((participantId) => {
        connectionManager.emitToUser(
          participantId.toString(),
          REACTION.UPDATED,
          reactionData
        );
      });
    } catch (error) {
      console.error("Error in reaction:add handler:", error.message);
      socket.emit(REACTION.ERROR, {
        error: "Failed to add reaction",
        messageId: data?.messageId,
        details: error.message,
      });
    }
  });

  /**
   * Handle reaction:remove event
   * Client explicitly removes their reaction from a message
   */
  socket.on(REACTION.REMOVE, async (data) => {
    try {
      const { messageId } = data;
      const userId = socket.user._id;

      // Validate input
      if (!messageId) {
        socket.emit(REACTION.ERROR, {
          error: "Missing required field: messageId",
          messageId,
        });
        return;
      }

      // Check if message exists and is not deleted
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit(REACTION.ERROR, {
          error: "Message not found",
          messageId,
        });
        return;
      }

      if (message.isDeleted) {
        socket.emit(REACTION.ERROR, {
          error: "Cannot modify reactions on deleted message",
          messageId,
        });
        return;
      }

      // Check if user is participant in conversation
      const conversation = await Conversation.findById(message.conversationId);
      if (!conversation) {
        socket.emit(REACTION.ERROR, {
          error: "Conversation not found",
          messageId,
        });
        return;
      }

      if (
        !conversation.participants.some(
          (p) => p.toString() === userId.toString()
        )
      ) {
        socket.emit(REACTION.ERROR, {
          error: "Not authorized to modify this message",
          messageId,
        });
        return;
      }

      // Find existing reaction by this user
      const existingReaction = message.reactions?.find(
        (reaction) => reaction.userId.toString() === userId.toString()
      );

      if (!existingReaction) {
        socket.emit(REACTION.ERROR, {
          error: "No reaction found to remove",
          messageId,
        });
        return;
      }

      const currentReactionType = existingReaction.reactionType;

      // Remove reaction
      const updateOperation = {
        $pull: { reactions: { userId: userId } },
        $inc: {
          [`reactionCounts.${currentReactionType}`]: -1,
          "reactionCounts.total": -1,
        },
      };

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        updateOperation,
        { new: true }
      );

      // Broadcast to all conversation participants (including sender)
      const reactionData = {
        messageId: messageId,
        reactions: updatedMessage.reactions,
        reactionCounts: updatedMessage.reactionCounts,
        userId: userId,
        action: "removed",
      };

      conversation.participants.forEach((participantId) => {
        connectionManager.emitToUser(
          participantId.toString(),
          REACTION.UPDATED,
          reactionData
        );
      });
    } catch (error) {
      console.error("Error in reaction:remove handler:", error.message);
      socket.emit(REACTION.ERROR, {
        error: "Failed to remove reaction",
        messageId: data?.messageId,
        details: error.message,
      });
    }
  });
  
  } catch (error) {
    console.error("Error setting up reaction handler:", error.message);
  }
}

module.exports = reactionHandler;
