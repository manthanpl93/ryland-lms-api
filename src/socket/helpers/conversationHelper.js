/**
 * Find or create a conversation between two users
 * @param {Application} app - Feathers application instance
 * @param {string} senderId - Sender user ID
 * @param {string} recipientId - Recipient user ID
 * @returns {Promise<Object>} Conversation object
 */
async function findOrCreateConversation(app, senderId, recipientId) {
  try {
    // Try to find existing conversation
    const existingConversations = await app.service("conversations").find({
      query: {
        participants: { $all: [senderId, recipientId] },
      },
      paginate: false,
    });

    if (existingConversations && existingConversations.length > 0) {
      return existingConversations[0];
    }

    // Create new conversation if not found
    const conversation = await app.service("conversations").create(
      {
        recipientId,
      },
      {
        user: { _id: senderId },
      }
    );

    return conversation;
  } catch (error) {
    console.error("Error finding or creating conversation:", error);
    throw error;
  }
}

module.exports = {
  findOrCreateConversation,
};
