# Message Attachments Documentation

This document contains the documentation updates for message attachments feature.

## Add to database-schema.md

### After the Reply Message Example section, add:

#### Example: Message with Image Attachment

```json
{
  "_id": "657d4e5f6g7h8i9j0k1l2m3n",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Check out this photo!",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T16:00:01.000Z",
    "read": false,
    "readAt": null
  },
  "attachments": [
    {
      "_id": "657e5f6g7h8i9j0k1l2m3n4o",
      "type": "image",
      "url": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/1703001234-vacation.jpg",
      "metadata": {
        "filename": "vacation.jpg",
        "size": 245678,
        "mimeType": "image/jpeg",
        "width": 1920,
        "height": 1080,
        "thumbnail": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/thumbnails/1703001234-thumb-vacation.jpg"
      },
      "uploadedAt": "2025-12-16T16:00:00.000Z"
    }
  ],
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-12-16T16:00:00.000Z",
  "updatedAt": "2025-12-16T16:00:01.000Z"
}
```

#### Example: Message with Multiple Attachments

```json
{
  "_id": "657f6g7h8i9j0k1l2m3n4o5p",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Here's the report and screenshot",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T16:05:01.000Z",
    "read": false,
    "readAt": null
  },
  "attachments": [
    {
      "_id": "6580g7h8i9j0k1l2m3n4o5p6",
      "type": "image",
      "url": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/1703001456-screenshot.png",
      "metadata": {
        "filename": "screenshot.png",
        "size": 123456,
        "mimeType": "image/png",
        "width": 1024,
        "height": 768,
        "thumbnail": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/thumbnails/1703001456-thumb-screenshot.jpg"
      },
      "uploadedAt": "2025-12-16T16:05:00.000Z"
    },
    {
      "_id": "6581h8i9j0k1l2m3n4o5p6q7",
      "type": "document",
      "url": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/1703001456-report.pdf",
      "metadata": {
        "filename": "report.pdf",
        "size": 567890,
        "mimeType": "application/pdf"
      },
      "uploadedAt": "2025-12-16T16:05:00.000Z"
    }
  ],
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-12-16T16:05:00.000Z",
  "updatedAt": "2025-12-16T16:05:01.000Z"
}
```

#### Example: Message with Link Preview

```json
{
  "_id": "6582i9j0k1l2m3n4o5p6q7r8",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Check out this article: https://example.com/amazing-article",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T16:10:01.000Z",
    "read": false,
    "readAt": null
  },
  "attachments": [
    {
      "_id": "6583j0k1l2m3n4o5p6q7r8s9",
      "type": "link",
      "url": "https://example.com/amazing-article",
      "metadata": {
        "title": "10 Amazing Facts About Technology",
        "description": "Discover the most interesting facts about modern technology and how it's changing our world.",
        "image": "https://example.com/images/tech-article.jpg",
        "siteName": "Tech News",
        "url": "https://example.com/amazing-article"
      },
      "uploadedAt": "2025-12-16T16:10:00.000Z"
    }
  ],
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-12-16T16:10:00.000Z",
  "updatedAt": "2025-12-16T16:10:01.000Z"
}
```

---

### 3. Conversation Attachments Collection

Separate collection for efficient attachment filtering and querying. Denormalizes attachment data from messages for performance.

#### Schema Definition

```javascript
{
  _id: ObjectId,                    // Auto-generated unique identifier
  conversationId: ObjectId,         // Reference to conversation (required, indexed)
  messageId: ObjectId,              // Reference to message (required, indexed)
  attachmentId: ObjectId,           // Matches attachment._id in message (indexed)
  type: String,                     // Attachment type: 'image', 'link', 'document' (indexed)
  url: String,                      // S3 URL or external URL (required)
  metadata: Object,                 // Denormalized metadata from message
  senderId: ObjectId,               // User who sent the message (required, indexed)
  createdAt: Date,                  // Auto-generated (Mongoose timestamp)
  updatedAt: Date                   // Auto-generated (Mongoose timestamp)
}
```

#### Field Details

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Unique record identifier |
| `conversationId` | ObjectId | Yes | - | Parent conversation reference |
| `messageId` | ObjectId | Yes | - | Parent message reference |
| `attachmentId` | ObjectId | Yes | - | Attachment ID from message |
| `type` | String | Yes | - | Attachment type for filtering |
| `url` | String | Yes | - | Attachment URL |
| `metadata` | Object | Yes | - | Denormalized metadata |
| `senderId` | ObjectId | Yes | - | Message sender |
| `createdAt` | Date | Yes | Auto | When record was created |
| `updatedAt` | Date | Yes | Auto | When record was last updated |

#### Indexes

```javascript
// Filter attachments by conversation and type
{ conversationId: 1, type: 1 }

// Sort attachments by date
{ conversationId: 1, createdAt: -1 }

// Find attachments for a message
{ messageId: 1, attachmentId: 1 }
```

**Index Usage:**
- **Type Filtering**: Uses `conversationId + type` compound index
- **Chronological Listing**: Uses `conversationId + createdAt` compound index
- **Message Attachments**: Uses `messageId + attachmentId` compound index

#### Virtual Fields

```javascript
// Populate message object
conversationAttachment.message → Message

// Populate sender user object
conversationAttachment.sender → User
```

#### Example Document

```json
{
  "_id": "6584k1l2m3n4o5p6q7r8s9t0",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "messageId": "657d4e5f6g7h8i9j0k1l2m3n",
  "attachmentId": "657e5f6g7h8i9j0k1l2m3n4o",
  "type": "image",
  "url": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/1703001234-vacation.jpg",
  "metadata": {
    "filename": "vacation.jpg",
    "size": 245678,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "thumbnail": "https://cdn.ryland-lms.com/message-attachments/507f1f77bcf86cd799439011/thumbnails/1703001234-thumb-vacation.jpg"
  },
  "senderId": "507f1f77bcf86cd799439011",
  "createdAt": "2025-12-16T16:00:00.000Z",
  "updatedAt": "2025-12-16T16:00:00.000Z"
}
```

#### Query Examples

**Get all attachments for a conversation:**
```javascript
GET /conversation-attachments?conversationId=657a1b2c3d4e5f6g7h8i9j0k
```

**Filter by attachment type:**
```javascript
// Only images
GET /conversation-attachments?conversationId=657a1b2c3d4e5f6g7h8i9j0k&type=image

// Only documents
GET /conversation-attachments?conversationId=657a1b2c3d4e5f6g7h8i9j0k&type=document

// Only links
GET /conversation-attachments?conversationId=657a1b2c3d4e5f6g7h8i9j0k&type=link
```

**Pagination:**
```javascript
GET /conversation-attachments?conversationId=657a1b2c3d4e5f6g7h8i9j0k&$limit=20&$skip=0
```

---

## Attachment Size Limits and Validation

### File Size Limits

| Type | Maximum Size | Allowed Formats |
|------|--------------|-----------------|
| Images | 10 MB | jpg, jpeg, png, gif, webp, heic |
| Documents | 25 MB | pdf, docx, xlsx |
| Links | N/A | Any valid URL |

### MIME Type Validation

**Images:**
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/heic`

**Documents:**
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx)

### Thumbnail Generation

Images automatically get thumbnails generated with the following specs:
- Maximum dimensions: 300x300 pixels
- Maintains aspect ratio
- Format: JPEG (quality: 80%)
- Stored in S3: `message-attachments/{userId}/thumbnails/`

### Link Preview Extraction

Link previews are extracted automatically if:
- Message content contains a URL
- No link attachment was provided by client
- Uses Open Graph tags if available
- Falls back to HTML meta tags
- Timeout: 5 seconds
- Gracefully degrades on failure

---

## Attachment Storage

### S3 Path Structure

```
message-attachments/
  ├── {userId}/
  │   ├── {timestamp}-{sanitized-filename}  // Original files
  │   └── thumbnails/
  │       └── {timestamp}-thumb-{sanitized-filename}  // Thumbnails
```

### Example Paths

```
message-attachments/507f1f77bcf86cd799439011/1703001234-vacation.jpg
message-attachments/507f1f77bcf86cd799439011/thumbnails/1703001234-thumb-vacation.jpg
message-attachments/507f1f77bcf86cd799439011/1703001456-report.pdf
```

### File Naming

- Timestamp prefix prevents collisions
- Sanitized filenames (removes special characters)
- Original extension preserved
- Thumbnails prefixed with "thumb-"

---

## Notes

- Attachments are embedded in messages for atomic operations
- Conversation-attachments collection is denormalized for efficient filtering
- Multiple attachments per message supported
- Attachments persist when messages are soft-deleted
- Access control enforced at conversation level
