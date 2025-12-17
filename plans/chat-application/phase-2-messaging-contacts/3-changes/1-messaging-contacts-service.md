# Change 1: Service - messaging-contacts.service.ts

**Type:** Service  
**File:** messaging-contacts.service.ts  
**Location:** `src/services/messaging-contacts/messaging-contacts.service.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Creates a new Feathers service for messaging contacts at `/messaging-contacts` endpoint. This service provides role-based contact lists for Students, Teachers, and Admins. The service integrates with the Feathers app and sets up the necessary service class, hooks, and route registration.

## For APIs: Operation Details

**Operation:** `find`  
**Path:** `/messaging-contacts`  
**Controller/Function:** `MessagingContactsService.find()`

## Affected Files

```
src/
├── services/
│   ├── messaging-contacts/
│   │   ├── [+] messaging-contacts.service.ts ──→ Service registration
│   │   ├── [+] messaging-contacts.class.ts ──→ Service class
│   │   └── [+] messaging-contacts.hooks.ts ──→ Service hooks
│   │
│   └── index.ts ──→ [~] Register new service
│
└── types/
    └── [+] messaging-contacts.types.ts ──→ Service interfaces
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Service Registration

**What it does:**
Registers the messaging-contacts service with the Feathers application, making it available at the `/messaging-contacts` endpoint.

**Why added/changed:**
New service needs to be integrated into the Feathers app to handle HTTP requests and provide contact lists.

**Implementation approach:**
```typescript
// Register service with Feathers app
app.use('/messaging-contacts', new MessagingContactsService(options, app));

// Get service instance
const service = app.service('messaging-contacts');

// Apply hooks
service.hooks(messagingContactsHooks);
```

### Logical Block 2: Service Configuration

**What it does:**
Configures the service with necessary options and dependencies.

**Why added/changed:**
Service needs access to database models and other services for aggregations.

**Implementation approach:**
```typescript
// Service options
const options = {
  Model: app.get('mongooseClient').models.users,
  paginate: app.get('paginate')
};

// Pass to service constructor
```

## Code Changes

### In `services/messaging-contacts/messaging-contacts.service.ts`:

**Adding new service file:**
```typescript
import { Application } from '../declarations';
import { MessagingContactsService } from './messaging-contacts.class';
import hooks from './messaging-contacts.hooks';

export default function (app: Application): void {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize service
  app.use('/messaging-contacts', new MessagingContactsService(options, app));

  // Get service instance
  const service = app.service('messaging-contacts');

  // Apply hooks
  service.hooks(hooks);
}
```

### In `services/index.ts`:

**Adding service registration:**
```typescript
import messagingContacts from './messaging-contacts/messaging-contacts.service';

export default function (app: Application): void {
  // ... other services
  
  app.configure(messagingContacts); // Add this line
}
```

## Dependencies

- [+] `messaging-contacts.class.ts` (Service) - Service implementation
- [+] `messaging-contacts.hooks.ts` (Hook) - Service hooks
- [+] `messaging-contacts.types.ts` (Type) - TypeScript interfaces
- [~] `services/index.ts` (Service) - Service registration

## Models & Types

```typescript
// Service Options
interface MessagingContactsServiceOptions {
  paginate?: {
    default: number;
    max: number;
  };
}

// Service Interface
interface MessagingContactsService {
  find(params?: Params): Promise<Contact[]>;
}
```

## Error Codes

**Common Errors:**
- **401 NotAuthenticated:** `'Authentication required'` - User not logged in
- **403 Forbidden:** `'Insufficient permissions'` - User lacks access
- **500 GeneralError:** `'Failed to fetch contacts'` - Server error

**Usage:**
```typescript
import { NotAuthenticated, Forbidden, GeneralError } from '@feathersjs/errors';

throw new NotAuthenticated('Authentication required');
```

## Database Changes (if applicable)
- [ ] No database changes needed (uses existing collections)
- [ ] No indexes needed (relies on existing indexes)
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

