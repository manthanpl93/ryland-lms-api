# Database Models

## Overview

This document provides comprehensive specifications for all database models required for Phase 1 of the chat application. Service implementations are documented in `3-api-design.md`.

---

## Database Models

### 1. Conversations Model

**File:** `src/models/conversations.model.ts`  
**Collection:** `conversations`  
**Purpose:** Track 1-on-1 conversation threads between two users

#### Schema Structure

```typescript
{
  // Array of exactly 2 user IDs
  participants: [ObjectId] (ref: 'users', required, indexed),
  
  // Last message metadata for conversation list
  lastMessage: {
    content: String (trimmed),
    senderId: ObjectId (ref: 'users'),
    timestamp: Date
  },
  
  // Timestamp of last message (for sorting)
  lastMessageAt: Date (default: Date.now, indexed),
  
  // Unread count per participant (key: userId, value: count)
  unreadCount: Map<String, Number> (default: {}),
  
  // Soft delete / archive
  isActive: Boolean (default: true),
  
  // Auto-generated timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes

```typescript
// Find conversations for a user
{ participants: 1 }

// Sort by recent activity
{ lastMessageAt: -1 }

// Prevent duplicate conversations (unique)
{ participants: 1 } (unique: true)
```

#### Validation

- Must have exactly 2 participants (enforced in pre-save hook)
- Participants must be valid user IDs

#### Methods

```typescript
// Get the other participant in conversation
conversation.getOtherParticipant(userId: string): ObjectId
```

#### Virtuals

```typescript
// Access all messages in conversation
conversation.messages -> Message[]
```

#### Complete Model Code

```typescript
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "conversations";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const conversationsSchema = new Schema(
    {
      participants: [
        {
          type: Schema.Types.ObjectId,
          ref: "users",
          required: true,
          index: true,
        },
      ],
      
      lastMessage: {
        content: { type: String, trim: true },
        senderId: { type: Schema.Types.ObjectId, ref: "users" },
        timestamp: { type: Date },
      },
      
      lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
      
      unreadCount: {
        type: Map,
        of: Number,
        default: {},
      },
      
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes
  conversationsSchema.index({ participants: 1 });
  conversationsSchema.index({ lastMessageAt: -1 });
  conversationsSchema.index({ participants: 1 }, { unique: true });

  // Validation: Exactly 2 participants
  conversationsSchema.pre("save", function (next) {
    if (this.participants.length !== 2) {
      next(new Error("Conversation must have exactly 2 participants"));
    } else {
      next();
    }
  });

  // Method: Get other participant
  conversationsSchema.methods.getOtherParticipant = function (userId: string) {
    return this.participants.find(
      (id: any) => id.toString() !== userId.toString()
    );
  };

  // Virtual: messages
  conversationsSchema.virtual("messages", {
    ref: "messages",
    localField: "_id",
    foreignField: "conversationId",
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, conversationsSchema);
}
```

---

### 2. Messages Model

**File:** `src/models/messages.model.ts`  
**Collection:** `messages`  
**Purpose:** Store individual chat messages with status tracking

#### Schema Structure

```typescript
{
  // Conversation reference
  conversationId: ObjectId (ref: 'conversations', required, indexed),
  
  // Sender and recipient
  senderId: ObjectId (ref: 'users', required, indexed),
  recipientId: ObjectId (ref: 'users', required, indexed),
  
  // Message content
  content: String (required, trimmed),
  
  // Extended status tracking
  status: {
    delivered: Boolean (default: false),
    deliveredAt: Date,
    read: Boolean (default: false),
    readAt: Date
  },
  
  // Edit tracking
  isEdited: Boolean (default: false),
  editedAt: Date,
  originalContent: String,
  
  // Soft delete
  isDeleted: Boolean (default: false),
  deletedAt: Date,
  deletedBy: ObjectId (ref: 'users'),
  
  // Auto-generated timestamps
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes

```typescript
// Paginated message retrieval by conversation
{ conversationId: 1, createdAt: -1 }

// Direct sender-recipient lookups
{ senderId: 1, recipientId: 1, createdAt: -1 }

// Filter deleted messages
{ conversationId: 1, isDeleted: 1 }
```

#### Virtuals

```typescript
// Populate sender details
message.sender -> User

// Populate recipient details
message.recipient -> User
```

#### Complete Model Code

```typescript
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "messages";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const messagesSchema = new Schema(
    {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: "conversations",
        required: true,
        index: true,
      },
      
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      
      recipientId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      
      content: {
        type: String,
        required: true,
        trim: true,
      },
      
      status: {
        delivered: {
          type: Boolean,
          default: false,
        },
        deliveredAt: {
          type: Date,
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
        },
      },
      
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: {
        type: Date,
      },
      originalContent: {
        type: String,
      },
      
      isDeleted: {
        type: Boolean,
        default: false,
      },
      deletedAt: {
        type: Date,
      },
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes
  messagesSchema.index({ conversationId: 1, createdAt: -1 });
  messagesSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
  messagesSchema.index({ conversationId: 1, isDeleted: 1 });

  // Virtual: sender
  messagesSchema.virtual("sender", {
    ref: "users",
    localField: "senderId",
    foreignField: "_id",
    justOne: true,
  });

  // Virtual: recipient
  messagesSchema.virtual("recipient", {
    ref: "users",
    localField: "recipientId",
    foreignField: "_id",
    justOne: true,
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, messagesSchema);
}
```

---

## Summary

This document provides complete specifications for:

1. **Conversations Model** - Track 1-on-1 conversation threads between two users
2. **Messages Model** - Store chat messages with extended status tracking

**Related Documentation:**
- Service implementations → See `3-api-design.md`
- Architecture overview → See `2-architecture.md`
- Implementation steps → See `4-implementation-steps.md`

