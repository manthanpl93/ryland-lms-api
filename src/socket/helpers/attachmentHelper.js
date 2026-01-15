const { fetchLinkPreview, extractUrlsFromText } = require('../../utils/link-preview');

/**
 * Generate thumbnails for image attachments
 * @param {Array} attachments - Array of attachments
 * @param {Object} app - Feathers app instance
 * @param {Object} user - User object
 * @returns {Promise<Array>} Attachments with thumbnails
 */
async function processImageAttachments(attachments, app, user) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const messageAttachmentsUpload = app.service('message-attachments-upload');
  const processedAttachments = [];

  for (const attachment of attachments) {
    const processed = { ...attachment };

    // Generate thumbnail for image attachments
    if (attachment.type === 'image' && attachment.url) {
      try {
        const thumbnailData = await messageAttachmentsUpload.create({
          controller: 'generateThumbnail',
          url: attachment.url,
          maxWidth: 300,
          maxHeight: 300
        }, { user });

        // Update metadata with thumbnail URL
        processed.metadata = {
          ...attachment.metadata,
          thumbnail: thumbnailData.thumbnailUrl,
          width: thumbnailData.width,
          height: thumbnailData.height
        };
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Continue without thumbnail if generation fails
      }
    }

    processedAttachments.push(processed);
  }

  return processedAttachments;
}

/**
 * Extract and fetch link previews from message content
 * @param {string} content - Message content
 * @param {Array} existingAttachments - Existing attachments from client
 * @returns {Promise<Array>} Link attachments
 */
async function extractLinkPreviews(content, existingAttachments = []) {
  const linkAttachments = [];

  // Check if client already provided link attachments
  const hasLinkAttachments = existingAttachments.some(a => a.type === 'link');
  if (hasLinkAttachments) {
    // Client already provided link previews, don't fetch again
    return [];
  }

  // Extract URLs from content
  const urls = extractUrlsFromText(content);
  if (urls.length === 0) {
    return [];
  }

  // Fetch preview for first URL only (to avoid spamming)
  const firstUrl = urls[0];
  try {
    const preview = await fetchLinkPreview(firstUrl, 5000);
    
    linkAttachments.push({
      type: 'link',
      url: preview.url,
      metadata: {
        title: preview.title,
        description: preview.description,
        image: preview.image,
        siteName: preview.siteName,
        url: preview.url
      },
      uploadedAt: new Date()
    });
  } catch (error) {
    console.log(`Could not fetch link preview for ${firstUrl}:`, error.message);
    // Gracefully degrade - don't add link attachment if preview fails
  }

  return linkAttachments;
}

/**
 * Validate attachment structure
 * @param {Object} attachment - Attachment to validate
 * @returns {boolean} True if valid
 */
function validateAttachment(attachment) {
  if (!attachment.type || !['image', 'link', 'document'].includes(attachment.type)) {
    return false;
  }
  if (!attachment.url) {
    return false;
  }
  if (!attachment.metadata) {
    return false;
  }
  return true;
}

/**
 * Create conversation-attachments records
 * @param {Array} attachments - Message attachments
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 * @param {string} senderId - Sender ID
 * @param {Object} app - Feathers app instance
 */
async function createConversationAttachments(attachments, conversationId, messageId, senderId, app) {
  if (!attachments || attachments.length === 0) {
    return;
  }

  const conversationAttachmentsService = app.service('conversation-attachments');

  for (const attachment of attachments) {
    try {
      await conversationAttachmentsService.createAttachmentRecord({
        conversationId,
        messageId,
        attachmentId: attachment._id.toString(),
        type: attachment.type,
        url: attachment.url,
        metadata: attachment.metadata,
        senderId
      });
    } catch (error) {
      console.error('Error creating conversation-attachments record:', error);
      // Continue even if this fails
    }
  }
}

module.exports = {
  processImageAttachments,
  extractLinkPreviews,
  validateAttachment,
  createConversationAttachments
};
