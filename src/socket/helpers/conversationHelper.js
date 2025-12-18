/**
 * Find or create a conversation between two users
 * @param {Application} app - Feathers application instance
 * @param {string} senderId - Sender user ID
 * @param {string} recipientId - Recipient user ID
 * @returns {Promise<Object>} Conversation object
 */
async function findOrCreateConversation(app, senderId, recipientId) {
  try {
    // Get the Conversation model
    const Conversation = app.service("conversations").Model;
    
    // Try to find existing conversation
    const existingConversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    }).populate("participants", "firstName lastName email role");

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation if not found
    const conversation = await Conversation.create({
      participants: [senderId, recipientId],
      unreadCount: {
        [senderId]: 0,
        [recipientId]: 0,
      },
    });

    // Populate participants
    await conversation.populate("participants", "firstName lastName email role");

    return conversation;
  } catch (error) {
    console.error("Error finding or creating conversation:", error);
    throw error;
  }
}

module.exports = {
  findOrCreateConversation,
};
