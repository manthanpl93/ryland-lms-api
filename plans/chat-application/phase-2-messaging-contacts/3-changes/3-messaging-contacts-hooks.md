# Change 3: Hooks - messaging-contacts.hooks.ts

**Type:** Hook  
**File:** messaging-contacts.hooks.ts  
**Location:** `src/services/messaging-contacts/messaging-contacts.hooks.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Implements Feathers hooks for the messaging-contacts service:
- `authenticate('jwt')` - Ensures user is authenticated
- `authorizeContactAccess()` - Validates user has access to requested contacts
- `validateQuery()` - Validates query parameters (role override for admins)
- `schoolAwareFilter()` - Automatically filters by school for non-admins

## For APIs: Operation Details

**Operation:** `find`  
**Path:** `/messaging-contacts`  
**Controller/Function:** Hooks applied to `MessagingContactsService.find()`

## Affected Files

```
src/
├── services/
│   └── messaging-contacts/
│       └── [+] messaging-contacts.hooks.ts ──→ Service hooks
│
└── hooks/
    ├── [~] authenticate.ts ──→ Existing authentication hook
    └── [+] authorize-contact-access.ts ──→ New authorization hook
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Authentication

**What it does:**
Validates that the user has a valid JWT token and attaches user object to params.

**Why added/changed:**
All contact requests must be authenticated to determine role and relationships.

**Implementation approach:**
```typescript
import { authenticate } from '@feathersjs/authentication';

// Before hook
before: {
  find: [authenticate('jwt')]
}

// User object will be available in params.user
```

### Logical Block 2: Authorization

**What it does:**
Validates that the user has permission to access contacts. For admin role override queries, validates that the requesting user is an admin.

**Why added/changed:**
Prevent unauthorized access to contact lists and role impersonation.

**Implementation approach:**
```typescript
// Check if user is trying to override role
if (context.params.query?.role) {
  // Only admins can override role
  if (context.params.user.role !== 'admin') {
    throw new Forbidden('Only admins can override role');
  }
}

// Validate school access for non-admins
if (context.params.user.role !== 'admin') {
  // Ensure user can only see contacts from their school
  context.params.query.school = context.params.user.school;
}
```

### Logical Block 3: Query Validation

**What it does:**
Validates query parameters and sanitizes input.

**Why added/changed:**
Prevent malicious queries and ensure data integrity.

**Implementation approach:**
```typescript
// Validate allowed query parameters
const allowedParams = ['role', 'search'];
const queryKeys = Object.keys(context.params.query || {});

for (const key of queryKeys) {
  if (!allowedParams.includes(key)) {
    throw new BadRequest(`Invalid query parameter: ${key}`);
  }
}

// Validate role parameter
if (context.params.query?.role) {
  const validRoles = ['student', 'teacher', 'admin'];
  if (!validRoles.includes(context.params.query.role)) {
    throw new BadRequest('Invalid role parameter');
  }
}
```

### Logical Block 4: School-Aware Filtering

**What it does:**
Automatically filters contacts by school for students and teachers to support multi-tenancy.

**Why added/changed:**
Ensure users only see contacts from their own school in multi-tenant deployments.

**Implementation approach:**
```typescript
// Apply school filter for non-admins
if (context.params.user.role !== 'admin') {
  context.params.schoolFilter = {
    school: context.params.user.school
  };
}
```

## Code Changes

### In `services/messaging-contacts/messaging-contacts.hooks.ts`:

**Adding new hooks file:**
```typescript
import { HooksObject } from '@feathersjs/feathers';
import { authenticate } from '@feathersjs/authentication';
import { BadRequest, Forbidden } from '@feathersjs/errors';

// Authorization hook
const authorizeContactAccess = async (context: any) => {
  const { user } = context.params;
  const { query } = context.params;

  // Check role override (admin only)
  if (query?.role && user.role !== 'admin') {
    throw new Forbidden('Only admins can override role parameter');
  }

  return context;
};

// Query validation hook
const validateQuery = async (context: any) => {
  const { query } = context.params;

  // Validate allowed query parameters
  const allowedParams = ['role', 'search'];
  const queryKeys = Object.keys(query || {});

  for (const key of queryKeys) {
    if (!allowedParams.includes(key)) {
      throw new BadRequest(`Invalid query parameter: ${key}`);
    }
  }

  // Validate role parameter
  if (query?.role) {
    const validRoles = ['student', 'teacher', 'admin'];
    if (!validRoles.includes(query.role)) {
      throw new BadRequest('Invalid role parameter');
    }
  }

  return context;
};

// School-aware filtering hook
const schoolAwareFilter = async (context: any) => {
  const { user } = context.params;

  // Non-admins should only see contacts from their school
  if (user.role !== 'admin' && user.school) {
    context.params.schoolFilter = {
      school: user.school
    };
  }

  return context;
};

export default {
  before: {
    all: [authenticate('jwt')],
    find: [
      validateQuery,
      authorizeContactAccess,
      schoolAwareFilter
    ]
  },
  after: {
    all: []
  },
  error: {
    all: []
  }
};
```

## Dependencies

- [~] `@feathersjs/authentication` (Package) - Existing authentication
- [~] `@feathersjs/errors` (Package) - Existing error types
- [+] `messaging-contacts.class.ts` (Service) - Service this hook applies to

## Models & Types

```typescript
// Hook Context
interface HookContext {
  app: Application;
  service: Service;
  params: {
    user: User;
    query?: MessagingContactsQuery;
    schoolFilter?: {
      school: string;
    };
  };
  method: 'find';
  type: 'before' | 'after';
}

// Query Type
interface MessagingContactsQuery {
  role?: 'student' | 'teacher' | 'admin';
  search?: string;
}
```

## Error Codes

**Common Errors:**
- **400 BadRequest:** `'Invalid query parameter: [param]'` - Unknown query param
- **400 BadRequest:** `'Invalid role parameter'` - Invalid role value
- **401 NotAuthenticated:** `'Not authenticated'` - Missing/invalid JWT
- **403 Forbidden:** `'Only admins can override role parameter'` - Non-admin role override attempt

**Usage:**
```typescript
import { BadRequest, Forbidden, NotAuthenticated } from '@feathersjs/errors';

throw new BadRequest('Invalid query parameter');
throw new Forbidden('Only admins can override role parameter');
```

## Database Changes (if applicable)
- [ ] No database changes needed
- [ ] No indexes needed
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

