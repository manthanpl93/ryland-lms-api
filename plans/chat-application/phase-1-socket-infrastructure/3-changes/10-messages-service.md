# Change 10: Service - Messages Service

**Type:** Service  
**Location:** `services/messages/messages.service.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Feathers service for managing individual chat messages. Provides RESTful API endpoints for creating, retrieving, updating, and deleting messages. Handles message persistence, status updates (delivered/read), and conversation updates.

## For APIs: Operation Details

**Base Path:** `/api/v1/messages`  
**Service Name:** `messages`

### Supported Operations

| Method | Operation | Description |
|--------|-----------|-------------|
| GET | `find()` | Get messages for a conversation (paginated) |
| GET | `get(id)` | Get specific message by ID |
| POST | `create()` | Create new message in conversation |
| PATCH | `patch(id)` | Update message (edit content, mark as read) |
| DELETE | `remove(id)` | Soft delete message |

## Affected Files

```
src/
├── services/
│   └── messages/
│       ├── [+] messages.service.ts ──→ Service registration
│       ├── [+] messages.class.ts ──→ Service class implementation
│       └── [+] messages.hooks.ts ──→ Hooks for validation/auth
│
├── models/
│   └── [+] messages.model.ts ──→ Mongoose schema
│
└── [~] services/index.ts ──→ Register service
```

**Legend:** [+] New, [~] Modified

## Logic/Implementation

### Logical Block 1: Find Messages

**What it does:**
Retrieves paginated messages for a conversation, sorted by creation date.

**Why added/changed:**
Users need to view message history with pagination for performance.

**Implementation approach:**
```typescript
async find(params) {
  const { conversationId } = params.query;
  
  // Find messages for conversation
  const messages = await this.Model.find({
    conversationId,
    isDeleted: false
  })
  .sort({ createdAt: -1 }) // Most recent first
  .populate('senderId', 'firstName lastName avatar')
  .limit(params.query.$limit || 50)
  .skip(params.query.$skip || 0);
  
  return messages;
}
```

### Logical Block 2: Create Message

**What it does:**
Creates a new message in a conversation and updates conversation's last message metadata.

**Why added/changed:**
Persist messages to database and keep conversation metadata in sync.

**Implementation approach:**
```typescript
async create(data, params) {
  const { conversationId, content, recipientId } = data;
  const senderId = params.user._id;
  
  // Create message
  const message = await this.Model.create({
    conversationId,
    senderId,
    recipientId,
    content: content.trim(),
    status: {
      delivered: false,
      read: false
    }
  });
  
  // Update conversation's last message
  await this.app.service('conversations').patch(conversationId, {
    lastMessage: {
      content: content.trim(),
      senderId,
      timestamp: message.createdAt
    },
    lastMessageAt: message.createdAt,
    $inc: {
      [`unreadCount.${recipientId}`]: 1 // Increment recipient's unread
    }
  });
  
  return message;
}
```

### Logical Block 3: Update Message Status

**What it does:**
Marks message as delivered or read, updating timestamps accordingly.

**Why added/changed:**
Track message delivery and read status for UI indicators.

**Implementation approach:**
```typescript
async patch(id, data, params) {
  const update: any = {};
  
  if (data.markAsRead) {
    update['status.read'] = true;
    update['status.readAt'] = new Date();
  }
  
  if (data.markAsDelivered) {
    update['status.delivered'] = true;
    update['status.deliveredAt'] = new Date();
  }
  
  if (data.content) {
    // Edit message
    update.originalContent = message.content;
    update.content = data.content.trim();
    update.isEdited = true;
    update.editedAt = new Date();
  }
  
  return await this.Model.findByIdAndUpdate(id, update, { new: true });
}
```

### Logical Block 4: Delete Message

**What it does:**
Soft deletes message by setting isDeleted flag instead of removing from database.

**Why added/changed:**
Preserve message history and allow for potential recovery.

**Implementation approach:**
```typescript
async remove(id, params) {
  const userId = params.user._id;
  
  return await this.Model.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId
    },
    { new: true }
  );
}
```

## Code Changes

### In `services/messages/messages.service.ts`:

**Service registration:**
```typescript
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { Messages } from './messages.class';
import hooks from './messages.hooks';

declare module '../../declarations' {
  interface ServiceTypes {
    'messages': Messages & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: app.get('mongooseClient').model('messages'),
    paginate: app.get('paginate')
  };

  // Initialize service
  app.use('/messages', new Messages(options, app));

  // Get service for hooks
  const service = app.service('messages');
  service.hooks(hooks);
}
```

### In `services/messages/messages.class.ts`:

**Service class implementation:**
```typescript
import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { Application } from '../../declarations';
import { Params } from '@feathersjs/feathers';
import { BadRequest, NotFound } from '@feathersjs/errors';

export class Messages extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { conversationId } = params?.query || {};

    if (!conversationId) {
      throw new BadRequest('conversationId is required');
    }

    // Verify user is participant
    const conversation = await this.app.service('conversations').get(conversationId);
    const userId = params?.user?._id;
    
    if (!conversation.participants.includes(userId)) {
      throw new NotFound('Conversation not found');
    }

    // Get messages
    const query = {
      conversationId,
      isDeleted: false,
      ...params?.query
    };

    const messages = await this.Model.find(query)
      .sort({ createdAt: -1 })
      .populate('senderId', 'firstName lastName avatar email')
      .populate('recipientId', 'firstName lastName avatar email')
      .limit(params?.query?.$limit || 50)
      .skip(params?.query?.$skip || 0);

    return messages;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { conversationId, content, recipientId } = data;
    const senderId = params?.user?._id;

    if (!conversationId || !content || !recipientId) {
      throw new BadRequest('Missing required fields');
    }

    // Verify conversation exists
    const conversation = await this.app.service('conversations').get(conversationId);
    
    if (!conversation.participants.includes(senderId)) {
      throw new BadRequest('Not a participant in conversation');
    }

    // Create message
    const message = await this.Model.create({
      conversationId,
      senderId,
      recipientId,
      content: content.trim(),
      status: {
        delivered: false,
        read: false
      }
    });

    // Update conversation
    await this.app.service('conversations').patch(conversationId, {
      lastMessage: {
        content: content.trim(),
        senderId,
        timestamp: message.createdAt
      },
      lastMessageAt: message.createdAt,
      $inc: {
        [`unreadCount.${recipientId}`]: 1
      }
    });

    return message;
  }

  async patch(id: string, data: any, params?: Params): Promise<any> {
    const message = await this.Model.findById(id);
    
    if (!message) {
      throw new NotFound('Message not found');
    }

    const update: any = {};

    // Mark as read
    if (data.markAsRead) {
      update['status.read'] = true;
      update['status.readAt'] = new Date();
    }

    // Mark as delivered
    if (data.markAsDelivered) {
      update['status.delivered'] = true;
      update['status.deliveredAt'] = new Date();
    }

    // Edit content
    if (data.content) {
      update.originalContent = message.content;
      update.content = data.content.trim();
      update.isEdited = true;
      update.editedAt = new Date();
    }

    return await this.Model.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).populate('senderId recipientId', 'firstName lastName avatar email');
  }

  async remove(id: string, params?: Params): Promise<any> {
    const userId = params?.user?._id;
    const message = await this.Model.findById(id);

    if (!message) {
      throw new NotFound('Message not found');
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      throw new BadRequest('Only sender can delete message');
    }

    // Soft delete
    return await this.Model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId
      },
      { new: true }
    );
  }
}
```

### In `services/messages/messages.hooks.ts`:

**Service hooks:**
```typescript
import { HooksObject } from '@feathersjs/feathers';
import * as authentication from '@feathersjs/authentication';

const { authenticate } = authentication.hooks;

export default {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
```

## Dependencies

- [+] `messages.model.ts` (Model) - Mongoose schema
- [~] `conversations` (Service) - Update conversation metadata
- [+] `feathers-mongoose` (Package) - Service base class
- [+] `@feathersjs/authentication` (Package) - JWT auth

## Models & Types

```typescript
// Message interface
interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: {
    delivered: boolean;
    deliveredAt?: Date;
    read: boolean;
    readAt?: Date;
  };
  isEdited: boolean;
  editedAt?: Date;
  originalContent?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create message payload
interface CreateMessageData {
  conversationId: string;
  recipientId: string;
  content: string;
}

// Patch message payload
interface PatchMessageData {
  markAsRead?: boolean;
  markAsDelivered?: boolean;
  content?: string;
}

// Find query params
interface MessageQuery {
  conversationId: string;
  $limit?: number;
  $skip?: number;
  $sort?: {
    createdAt?: -1 | 1;
  };
}
```

## Error Codes

**Common Errors:**
- **400 BadRequest:** `'Missing required fields'` - Required fields not provided
- **400 BadRequest:** `'conversationId is required'` - Missing conversationId in query
- **400 BadRequest:** `'Not a participant in conversation'` - User not in conversation
- **400 BadRequest:** `'Only sender can delete message'` - Non-sender trying to delete
- **401 NotAuthenticated:** `'User not authenticated'` - No JWT token
- **404 NotFound:** `'Conversation not found'` - Invalid conversation ID
- **404 NotFound:** `'Message not found'` - Invalid message ID

**Usage:**
```typescript
import { BadRequest, NotFound } from '@feathersjs/errors';

throw new BadRequest('Missing required fields');
throw new NotFound('Message not found');
```

## Database Changes

- [x] Uses existing `messages` model from `5-models.md`
- [x] Requires indexes on `conversationId`, `senderId`, `recipientId`
- [x] No migrations needed (model already defined)

---

[← Back to API Design Overview](../3-api-design.md)

