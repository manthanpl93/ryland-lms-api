# Change 9: Service - Conversations Service

**Type:** Service  
**Location:** `services/conversations/conversations.service.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Feathers service for managing conversation threads between users. Provides RESTful API endpoints for creating, retrieving, and managing 1-on-1 conversations. Handles conversation lookup, participant validation, and unread count management.

## For APIs: Operation Details

**Base Path:** `/api/v1/conversations`  
**Service Name:** `conversations`

### Supported Operations

| Method | Operation | Description |
|--------|-----------|-------------|
| GET | `find()` | Get all conversations for authenticated user |
| GET | `get(id)` | Get specific conversation by ID |
| POST | `create()` | Create new conversation between two users |
| PATCH | `patch(id)` | Update conversation (e.g., mark messages as read) |
| DELETE | `remove(id)` | Soft delete/archive conversation |

## Affected Files

```
src/
├── services/
│   └── conversations/
│       ├── [+] conversations.service.ts ──→ Service registration
│       ├── [+] conversations.class.ts ──→ Service class implementation
│       └── [+] conversations.hooks.ts ──→ Hooks for validation/auth
│
├── models/
│   └── [+] conversations.model.ts ──→ Mongoose schema
│
└── [~] services/index.ts ──→ Register service
```

**Legend:** [+] New, [~] Modified

## Logic/Implementation

### Logical Block 1: Find Conversations

**What it does:**
Retrieves all conversations for the authenticated user, sorted by most recent activity.

**Why added/changed:**
Users need to see their conversation list with latest messages and unread counts.

**Implementation approach:**
```typescript
async find(params) {
  const userId = params.user._id;
  
  // Find conversations where user is a participant
  const conversations = await this.Model.find({
    participants: userId,
    isActive: true
  })
  .sort({ lastMessageAt: -1 })
  .populate('participants', 'firstName lastName avatar')
  .limit(params.query.$limit || 50)
  .skip(params.query.$skip || 0);
  
  return conversations;
}
```

### Logical Block 2: Create Conversation

**What it does:**
Creates a new conversation between two users, or returns existing conversation if one already exists.

**Why added/changed:**
Prevent duplicate conversations between the same two users.

**Implementation approach:**
```typescript
async create(data, params) {
  const { recipientId } = data;
  const senderId = params.user._id;
  
  // Check if conversation already exists
  const existing = await this.Model.findOne({
    participants: { $all: [senderId, recipientId] }
  });
  
  if (existing) {
    return existing; // Return existing conversation
  }
  
  // Create new conversation
  const conversation = await this.Model.create({
    participants: [senderId, recipientId],
    unreadCount: {
      [senderId]: 0,
      [recipientId]: 0
    }
  });
  
  return conversation;
}
```

### Logical Block 3: Update Unread Count

**What it does:**
Updates unread message count when user reads messages in a conversation.

**Why added/changed:**
Track which conversations have unread messages for UI indicators.

**Implementation approach:**
```typescript
async patch(id, data, params) {
  const userId = params.user._id;
  
  if (data.markAsRead) {
    // Reset unread count for this user
    const update = {
      [`unreadCount.${userId}`]: 0
    };
    
    return await this.Model.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
  }
  
  return await this.Model.findByIdAndUpdate(id, data, { new: true });
}
```

## Code Changes

### In `services/conversations/conversations.service.ts`:

**Service registration:**
```typescript
import { ServiceAddons } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { Conversations } from './conversations.class';
import hooks from './conversations.hooks';

declare module '../../declarations' {
  interface ServiceTypes {
    'conversations': Conversations & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: app.get('mongooseClient').model('conversations'),
    paginate: app.get('paginate')
  };

  // Initialize service
  app.use('/conversations', new Conversations(options, app));

  // Get service for hooks
  const service = app.service('conversations');
  service.hooks(hooks);
}
```

### In `services/conversations/conversations.class.ts`:

**Service class implementation:**
```typescript
import { Service, MongooseServiceOptions } from 'feathers-mongoose';
import { Application } from '../../declarations';
import { Params } from '@feathersjs/feathers';

export class Conversations extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const userId = params?.user?._id;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Build query
    const query = {
      participants: userId,
      isActive: true,
      ...params?.query
    };

    // Get conversations sorted by recent activity
    const conversations = await this.Model.find(query)
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'firstName lastName avatar email')
      .limit(params?.query?.$limit || 50)
      .skip(params?.query?.$skip || 0);

    return conversations;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { recipientId } = data;
    const senderId = params?.user?._id;

    if (!senderId || !recipientId) {
      throw new Error('Missing required fields');
    }

    // Check for existing conversation
    const existing = await this.Model.findOne({
      participants: { $all: [senderId, recipientId] }
    });

    if (existing) {
      return existing;
    }

    // Validate recipient exists
    const recipient = await this.app.service('users').get(recipientId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Create new conversation
    const conversation = await this.Model.create({
      participants: [senderId, recipientId],
      unreadCount: {
        [senderId]: 0,
        [recipientId]: 0
      }
    });

    return conversation;
  }

  async patch(id: string, data: any, params?: Params): Promise<any> {
    const userId = params?.user?._id;

    // Handle marking as read
    if (data.markAsRead) {
      const update = {
        [`unreadCount.${userId}`]: 0
      };
      
      return await this.Model.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      ).populate('participants', 'firstName lastName avatar email');
    }

    return await this.Model.findByIdAndUpdate(
      id,
      data,
      { new: true }
    ).populate('participants', 'firstName lastName avatar email');
  }

  async remove(id: string, params?: Params): Promise<any> {
    // Soft delete
    return await this.Model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
}
```

### In `services/conversations/conversations.hooks.ts`:

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

- [+] `conversations.model.ts` (Model) - Mongoose schema
- [~] `users` (Service) - Validate recipient exists
- [+] `feathers-mongoose` (Package) - Service base class
- [+] `@feathersjs/authentication` (Package) - JWT auth

## Models & Types

```typescript
// Conversation interface
interface Conversation {
  _id: string;
  participants: string[]; // Array of user IDs
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  lastMessageAt: Date;
  unreadCount: Map<string, number>; // userId -> count
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create conversation payload
interface CreateConversationData {
  recipientId: string;
}

// Patch conversation payload
interface PatchConversationData {
  markAsRead?: boolean;
  isActive?: boolean;
}

// Find query params
interface ConversationQuery {
  $limit?: number;
  $skip?: number;
  $sort?: {
    lastMessageAt?: -1 | 1;
  };
}
```

## Error Codes

**Common Errors:**
- **400 BadRequest:** `'Missing required fields'` - recipientId not provided
- **401 NotAuthenticated:** `'User not authenticated'` - No JWT token
- **403 Forbidden:** `'Not authorized'` - User not participant in conversation
- **404 NotFound:** `'Recipient not found'` - Invalid recipient ID
- **404 NotFound:** `'Conversation not found'` - Invalid conversation ID

**Usage:**
```typescript
import { BadRequest, NotFound, Forbidden } from '@feathersjs/errors';

throw new BadRequest('Missing required fields');
throw new NotFound('Recipient not found');
throw new Forbidden('Not authorized');
```

## Database Changes

- [x] Uses existing `conversations` model from `5-models.md`
- [x] Requires indexes on `participants` and `lastMessageAt`
- [x] No migrations needed (model already defined)

---

[← Back to API Design Overview](../3-api-design.md)

