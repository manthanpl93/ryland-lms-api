# API Design

## Changes Overview

**File-based listing** (one section per file with link to detailed documentation):

### 1. `services/messaging-contacts/messaging-contacts.service.ts` - **[+] Added**
**Type:** Service  
**Purpose:** Register messaging contacts service with Feathers app  
**Key Functions:** Service registration, route setup at `/messaging-contacts`  
**Details:** [See detailed documentation →](./3-changes/1-messaging-contacts-service.md)

### 2. `services/messaging-contacts/messaging-contacts.class.ts` - **[+] Added**
**Type:** Service  
**Purpose:** Core service class with role-based contact filtering  
**Key Functions:** `find()` with role detection, contact aggregation orchestration  
**Details:** [See detailed documentation →](./3-changes/2-messaging-contacts-class.md)

### 3. `services/messaging-contacts/messaging-contacts.hooks.ts` - **[+] Added**
**Type:** Hook  
**Purpose:** Authentication, authorization, and query validation  
**Key Functions:** `authenticate()`, `authorizeContactAccess()`, `validateQuery()`  
**Details:** [See detailed documentation →](./3-changes/3-messaging-contacts-hooks.md)

### 4. `utils/contact-aggregations.ts` - **[+] Added**
**Type:** Util  
**Purpose:** MongoDB aggregation pipelines for each role  
**Key Functions:** `getStudentContactsAggregation()`, `getTeacherContactsAggregation()`, `getAdminContactsAggregation()`  
**Details:** [See detailed documentation →](./3-changes/4-contact-aggregations.md)

### 5. `utils/role-filters.ts` - **[+] Added**
**Type:** Util  
**Purpose:** Role-based filtering logic and permissions  
**Key Functions:** `canContactUser()`, `getSchoolFilter()`, `getRoleBasedQuery()`  
**Details:** [See detailed documentation →](./3-changes/5-role-filters.md)

### 6. `types/messaging-contacts.types.ts` - **[+] Added**
**Type:** Type  
**Purpose:** TypeScript interfaces for contacts and queries  
**Key Types:** `Contact`, `StudentContact`, `TeacherContact`, `ClassContact`, `MessagingContactsQuery`  
**Details:** [See detailed documentation →](./3-changes/6-messaging-contacts-types.md)

**Type Categories:**
- **Service** - Feathers service files
- **Model** - Database models
- **Util** - Utility functions
- **Migration** - Database migrations
- **Hook** - Feathers hooks
- **Middleware** - Express middleware
- **Type** - TypeScript type definitions
- **Handler** - Event/request handlers

**Status Legend:**
- **[+] Added** - New file created
- **[~] Modified** - Existing file updated
- **[-] Deleted** - File removed

**Format Guidelines:**
- Use numbered list format (easier to read than tables)
- One section per file with full path in heading
- Include Type, Purpose, and Key Functions for each file
- Link to detailed documentation in `3-changes/` directory

---

## Navigation

- [Change 1: Service - messaging-contacts.service.ts](./3-changes/1-messaging-contacts-service.md)
- [Change 2: Service Class - messaging-contacts.class.ts](./3-changes/2-messaging-contacts-class.md)
- [Change 3: Hooks - messaging-contacts.hooks.ts](./3-changes/3-messaging-contacts-hooks.md)
- [Change 4: Util - contact-aggregations.ts](./3-changes/4-contact-aggregations.md)
- [Change 5: Util - role-filters.ts](./3-changes/5-role-filters.md)
- [Change 6: Types - messaging-contacts.types.ts](./3-changes/6-messaging-contacts-types.md)

