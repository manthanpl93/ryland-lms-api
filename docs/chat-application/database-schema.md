# Database Schema Documentation

## Overview

The chat application uses MongoDB for persistent storage with two main collections: `conversations` and `messages`. Both collections use Mongoose ODM for schema definition and validation.

## Collections

### 1. Conversations Collection

Stores 1-on-1 conversation threads between two users.

#### Schema Definition

```javascript
{
  _id: ObjectId,                    // Auto-generated unique identifier
  participants: [ObjectId, ObjectId], // Exactly 2 user IDs (required, indexed)
  lastMessage: {                    // Denormalized last message data
    content: String,                // Message text (trimmed)
    senderId: ObjectId,             // Sender user ID
    timestamp: Date                 // When message was sent
  },
  lastMessageAt: Date,              // Timestamp for sorting (default: now, indexed)
  unreadCount: Map<String, Number>, // Per-user unread count (default: {})
  isActive: Boolean,                // Soft delete flag (default: true)
  createdAt: Date,                  // Auto-generated (Mongoose timestamp)
  updatedAt: Date                   // Auto-generated (Mongoose timestamp)
}
```

#### Field Details

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Unique conversation identifier |
| `participants` | Array[ObjectId] | Yes | - | Array of exactly 2 user IDs |
| `lastMessage.content` | String | No | - | Text of last message |
| `lastMessage.senderId` | ObjectId | No | - | User who sent last message |
| `lastMessage.timestamp` | Date | No | - | When last message was sent |
| `lastMessageAt` | Date | No | now | Timestamp for sorting conversations |
| `unreadCount` | Map | No | {} | Per-user unread message count |
| `isActive` | Boolean | No | true | Whether conversation is active/archived |
| `createdAt` | Date | Yes | Auto | When conversation was created |
| `updatedAt` | Date | Yes | Auto | When conversation was last updated |

#### Indexes

```javascript
// Find user's conversations
{ participants: 1 }

// Sort conversations by recent activity
{ lastMessageAt: -1 }

// Prevent duplicate conversations (unique constraint)
{ participants: 1 } (unique: true)
```

**Index Usage:**
- **Find Query**: Uses `participants` index
- **Sort Query**: Uses `lastMessageAt` index for efficient sorting
- **Duplicate Prevention**: Unique index on `participants`

#### Validation Rules

**Pre-save Hook:**
```javascript
// Validates exactly 2 participants
if (this.participants.length !== 2) {
  throw new Error('Conversation must have exactly 2 participants');
}
```

#### Virtual Fields

```javascript
// Access all messages in conversation
conversation.messages → Message[]
```

**Virtual Configuration:**
- References: `messages` collection
- Local field: `_id`
- Foreign field: `conversationId`

#### Methods

```javascript
// Get the other participant in a conversation
conversation.getOtherParticipant(userId: string) → ObjectId
```

#### Example Document

```json
{
  "_id": "657a1b2c3d4e5f6g7h8i9j0k",
  "participants": [
    "507f1f77bcf86cd799439011",
    "507f191e810c19729de860ea"
  ],
  "lastMessage": {
    "content": "Thanks for your help!",
    "senderId": "507f1f77bcf86cd799439011",
    "timestamp": "2025-12-16T15:30:00.000Z"
  },
  "lastMessageAt": "2025-12-16T15:30:00.000Z",
  "unreadCount": {
    "507f1f77bcf86cd799439011": 0,
    "507f191e810c19729de860ea": 2
  },
  "isActive": true,
  "createdAt": "2025-12-15T10:00:00.000Z",
  "updatedAt": "2025-12-16T15:30:00.000Z"
}
```

---

### 2. Messages Collection

Stores individual chat messages with status tracking and edit history.

#### Schema Definition

```javascript
{
  _id: ObjectId,                    // Auto-generated unique identifier
  conversationId: ObjectId,         // Reference to conversation (required, indexed)
  senderId: ObjectId,               // Message sender (required, indexed)
  recipientId: ObjectId,            // Message recipient (required, indexed)
  content: String,                  // Message text (required, trimmed)
  status: {                         // Message delivery status
    delivered: Boolean,             // Whether delivered (default: false)
    deliveredAt: Date,              // When delivered
    read: Boolean,                  // Whether read (default: false)
    readAt: Date                    // When read
  },
  isEdited: Boolean,                // Edit flag (default: false)
  editedAt: Date,                   // When edited
  originalContent: String,          // Original text before edit
  isDeleted: Boolean,               // Soft delete flag (default: false)
  deletedAt: Date,                  // When deleted
  deletedBy: ObjectId,              // User who deleted
  createdAt: Date,                  // Auto-generated (Mongoose timestamp)
  updatedAt: Date                   // Auto-generated (Mongoose timestamp)
}
```

#### Field Details

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Unique message identifier |
| `conversationId` | ObjectId | Yes | - | Parent conversation reference |
| `senderId` | ObjectId | Yes | - | User who sent the message |
| `recipientId` | ObjectId | Yes | - | User who receives the message |
| `content` | String | Yes | - | Message text content |
| `status.delivered` | Boolean | No | false | Message delivered to recipient |
| `status.deliveredAt` | Date | No | - | Timestamp of delivery |
| `status.read` | Boolean | No | false | Message read by recipient |
| `status.readAt` | Date | No | - | Timestamp of read |
| `isEdited` | Boolean | No | false | Whether message was edited |
| `editedAt` | Date | No | - | When message was edited |
| `originalContent` | String | No | - | Original message before edit |
| `isDeleted` | Boolean | No | false | Soft delete flag |
| `deletedAt` | Date | No | - | When message was deleted |
| `deletedBy` | ObjectId | No | - | User who deleted message |
| `createdAt` | Date | Yes | Auto | When message was created |
| `updatedAt` | Date | Yes | Auto | When message was last updated |

#### Indexes

```javascript
// Find messages in conversation (paginated)
{ conversationId: 1, createdAt: -1 }

// Find messages between two users
{ senderId: 1, recipientId: 1, createdAt: -1 }

// Filter out deleted messages
{ conversationId: 1, isDeleted: 1 }
```

**Index Usage:**
- **Conversation Messages**: Uses `conversationId + createdAt` compound index
- **User Messages**: Uses `senderId + recipientId + createdAt` compound index
- **Active Messages**: Uses `conversationId + isDeleted` for filtering

#### Virtual Fields

```javascript
// Populate sender user object
message.sender → User

// Populate recipient user object
message.recipient → User
```

**Virtual Configuration:**
- **Sender**: References `users` collection, local: `senderId`, foreign: `_id`
- **Recipient**: References `users` collection, local: `recipientId`, foreign: `_id`

#### Example Document

```json
{
  "_id": "657b2c3d4e5f6g7h8i9j0k1l",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Thanks for your help!",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T15:30:01.000Z",
    "read": true,
    "readAt": "2025-12-16T15:32:00.000Z"
  },
  "isEdited": false,
  "editedAt": null,
  "originalContent": null,
  "isDeleted": false,
  "deletedAt": null,
  "deletedBy": null,
  "createdAt": "2025-12-16T15:30:00.000Z",
  "updatedAt": "2025-12-16T15:32:00.000Z"
}
```

#### Example: Edited Message

```json
{
  "_id": "657b2c3d4e5f6g7h8i9j0k1l",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Thanks for all your help today!",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T15:30:01.000Z",
    "read": true,
    "readAt": "2025-12-16T15:32:00.000Z"
  },
  "isEdited": true,
  "editedAt": "2025-12-16T15:35:00.000Z",
  "originalContent": "Thanks for your help!",
  "isDeleted": false,
  "deletedAt": null,
  "deletedBy": null,
  "createdAt": "2025-12-16T15:30:00.000Z",
  "updatedAt": "2025-12-16T15:35:00.000Z"
}
```

#### Example: Deleted Message

```json
{
  "_id": "657b2c3d4e5f6g7h8i9j0k1l",
  "conversationId": "657a1b2c3d4e5f6g7h8i9j0k",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f191e810c19729de860ea",
  "content": "Thanks for all your help today!",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T15:30:01.000Z",
    "read": true,
    "readAt": "2025-12-16T15:32:00.000Z"
  },
  "isEdited": true,
  "editedAt": "2025-12-16T15:35:00.000Z",
  "originalContent": "Thanks for your help!",
  "isDeleted": true,
  "deletedAt": "2025-12-16T16:00:00.000Z",
  "deletedBy": "507f1f77bcf86cd799439011",
  "createdAt": "2025-12-16T15:30:00.000Z",
  "updatedAt": "2025-12-16T16:00:00.000Z"
}
```

---

## Relationships

### Conversation ↔ Messages

**One-to-Many Relationship:**
- One conversation has many messages
- Each message belongs to one conversation

```
Conversation (1)
    ↓
    ├─ Message 1
    ├─ Message 2
    ├─ Message 3
    └─ Message N
```

**Implemented via:**
- `conversationId` field in messages collection
- Virtual `messages` field in conversations collection

### Conversation ↔ Users

**Many-to-Many Relationship:**
- One conversation has exactly 2 users
- One user can have many conversations

```
User A ────┐
           ├─ Conversation 1
User B ────┘

User A ────┐
           ├─ Conversation 2
User C ────┘
```

**Implemented via:**
- `participants` array in conversations collection
- Population of user documents in queries

### Message → User

**Many-to-One Relationships:**
- Many messages from one sender
- Many messages to one recipient

```
User A (sender)
    ↓
    ├─ Message 1
    ├─ Message 2
    └─ Message 3

User B (recipient)
    ↑
    ├─ Message 1
    ├─ Message 2
    └─ Message 3
```

**Implemented via:**
- `senderId` and `recipientId` fields in messages collection
- Virtual `sender` and `recipient` fields for population

---

## Query Patterns

### Common Queries

#### 1. Get User's Conversations

```javascript
db.conversations.find({
  participants: userId,
  isActive: true
}).sort({ lastMessageAt: -1 }).limit(50)
```

**Index Used:** `{ participants: 1 }`, `{ lastMessageAt: -1 }`

#### 2. Get Messages in Conversation

```javascript
db.messages.find({
  conversationId: convId,
  isDeleted: false
}).sort({ createdAt: -1 }).limit(50)
```

**Index Used:** `{ conversationId: 1, createdAt: -1 }`

#### 3. Check for Existing Conversation

```javascript
db.conversations.findOne({
  participants: { $all: [userId1, userId2] }
})
```

**Index Used:** `{ participants: 1 }` (unique)

#### 4. Get Unread Message Count

```javascript
db.conversations.findOne(
  { _id: convId },
  { [`unreadCount.${userId}`]: 1 }
)
```

**Index Used:** Primary key lookup

#### 5. Find Messages Between Two Users

```javascript
db.messages.find({
  senderId: userId1,
  recipientId: userId2,
  isDeleted: false
}).sort({ createdAt: -1 })
```

**Index Used:** `{ senderId: 1, recipientId: 1, createdAt: -1 }`

---

## Data Integrity

### Referential Integrity

**Enforced by Application:**
- `conversationId` must reference existing conversation
- `senderId` and `recipientId` must reference existing users
- Participants must reference existing users

**Validation:**
- Mongoose schema validation
- Service-level checks before operations
- Authorization checks (user is participant)

### Consistency Rules

1. **Conversation participants are sorted** before saving
2. **Only sender can edit/delete** their messages
3. **Soft deletes** maintain audit trail
4. **Unread counts** reset when marking as read
5. **Last message metadata** updated on message create

---

## Performance Considerations

### Index Selectivity

- **Highly Selective**: `_id`, unique `participants`
- **Moderately Selective**: `conversationId`, `senderId`, `recipientId`
- **Low Selectivity**: `isActive`, `isDeleted`, `isEdited`

### Query Optimization Tips

1. **Always include conversationId** when querying messages
2. **Use pagination** with `$skip` and `$limit`
3. **Select only needed fields** with `$select` or projection
4. **Filter deleted messages** in application queries

### Storage Optimization

- **Trimmed strings**: All text fields use `trim: true`
- **Selective indexes**: Only indexed fields that are frequently queried
- **Denormalization**: `lastMessage` in conversations reduces joins

---

## Migration Notes

### Initial Setup

No migrations required. Collections and indexes are created automatically on first use by Mongoose.

### Future Schema Changes

If schema changes are needed:

1. Add new fields with default values
2. Make fields optional initially
3. Run data migration script
4. Make fields required after migration
5. Add new indexes as needed

### Backup Strategy

**Recommended:**
- Daily full backups of MongoDB
- Continuous oplog backup for point-in-time recovery
- Test restore procedures regularly

---

## Monitoring Queries

### Slow Query Detection

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// Find slow queries
db.system.profile.find({
  ns: /conversations|messages/,
  millis: { $gt: 100 }
})
```

### Index Usage Stats

```javascript
// Check index usage
db.conversations.aggregate([
  { $indexStats: {} }
])

db.messages.aggregate([
  { $indexStats: {} }
])
```

### Collection Stats

```javascript
// Get collection statistics
db.conversations.stats()
db.messages.stats()
```

---

## Data Retention

### Current Policy

- **Active conversations**: Retained indefinitely
- **Archived conversations**: Retained for 1 year
- **Deleted messages**: Retained (soft delete)

### Future Considerations

- Implement hard delete after retention period
- Archive old messages to separate collection
- Implement data export for users (GDPR compliance)

