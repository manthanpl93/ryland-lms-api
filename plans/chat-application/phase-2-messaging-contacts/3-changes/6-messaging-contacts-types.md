# Change 6: Types - messaging-contacts.types.ts

**Type:** Type  
**File:** messaging-contacts.types.ts  
**Location:** `src/types/messaging-contacts.types.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Defines TypeScript interfaces for the messaging contacts service:
- `Contact` - Base contact interface with basic user information
- `StudentContact` - Student-specific contact type
- `TeacherContact` - Teacher-specific contact type
- `ClassContact` - Class contact type (for admin broadcast)
- `MessagingContactsQuery` - Query parameters interface
- `ContactsResponse` - API response type

## Affected Files

```
src/
├── types/
│   └── [+] messaging-contacts.types.ts ──→ Type definitions
│
└── services/
    └── messaging-contacts/
        ├── [~] messaging-contacts.class.ts ──→ Uses types
        └── [~] messaging-contacts.hooks.ts ──→ Uses query types
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Base Contact Interface

**What it does:**
Defines the base contact structure with basic user information.

**Why added/changed:**
Provides type safety for contact objects returned by the service. Keeps it simple - just shows who you can contact.

**Implementation approach:**
```typescript
interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  school?: string;
}
```

### Logical Block 2: Role-Specific Contact Types

**What it does:**
Defines specialized contact types for different roles with additional context.

**Why added/changed:**
Different roles may need different contact information (e.g., students need class context).

**Implementation approach:**
```typescript
// Student contact with class information
interface StudentContact extends Contact {
  role: 'student';
  classes?: string[]; // Class IDs student is enrolled in
}

// Teacher contact with teaching classes
interface TeacherContact extends Contact {
  role: 'teacher';
  teachingClasses?: string[]; // Class IDs teacher teaches
}
```

### Logical Block 3: Query Parameters

**What it does:**
Defines allowed query parameters for filtering contacts.

**Why added/changed:**
Provides type safety for query parameters and validates admin role override.

**Implementation approach:**
```typescript
interface MessagingContactsQuery {
  role?: 'student' | 'teacher' | 'admin'; // Admin role override
  search?: string; // Search by name or email
  $limit?: number;
  $skip?: number;
}
```

### Logical Block 4: Response Types

**What it does:**
Defines the structure of API responses.

**Why added/changed:**
Ensures consistent response format with metadata.

**Implementation approach:**
```typescript
interface ContactsResponse {
  total: number;
  limit: number;
  skip: number;
  data: Contact[];
}
```

## Code Changes

### In `types/messaging-contacts.types.ts`:

**Adding new types file:**
```typescript
/**
 * Base contact interface
 */
export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  school?: string;
}

/**
 * Student contact with class context
 */
export interface StudentContact extends Contact {
  role: 'student';
  classes?: string[];
}

/**
 * Teacher contact with teaching classes
 */
export interface TeacherContact extends Contact {
  role: 'teacher';
  teachingClasses?: string[];
}

/**
 * Class contact for admin broadcast (future feature)
 */
export interface ClassContact {
  _id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  school?: string;
}

/**
 * Query parameters for messaging contacts
 */
export interface MessagingContactsQuery {
  role?: 'student' | 'teacher' | 'admin';
  search?: string;
  $limit?: number;
  $skip?: number;
}

/**
 * Service response type
 */
export interface ContactsResponse {
  total: number;
  limit: number;
  skip: number;
  data: Contact[];
}
```

## Dependencies

No dependencies - this is a pure types file.

## Models & Types

This file **IS** the types definition. It exports all interfaces for use in other files.

**Usage in other files:**
```typescript
import { Contact, MessagingContactsQuery } from '../../types/messaging-contacts.types';

// In service class
async find(params: Params): Promise<Contact[]> {
  // ...
}

// In hooks
const query: MessagingContactsQuery = params.query;
```

## Error Codes

No error codes - this is a types definition file.

## Database Changes (if applicable)
- [ ] No database changes
- [ ] No indexes needed
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

