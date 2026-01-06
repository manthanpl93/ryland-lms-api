# Change 2: Service Class - messaging-contacts.class.ts

**Type:** Service  
**File:** messaging-contacts.class.ts  
**Location:** `src/services/messaging-contacts/messaging-contacts.class.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Implements the core MessagingContactsService class with a `find()` method that:
- Detects the authenticated user's role (Student, Teacher, Admin)
- Routes to appropriate aggregation pipeline based on role
- Returns basic contact list with user information (name, email, avatar, role)

## For APIs: Operation Details

**Operation:** `find`  
**Path:** `/messaging-contacts`  
**Controller/Function:** `MessagingContactsService.find()`

## Affected Files

```
src/
├── services/
│   └── messaging-contacts/
│       └── [+] messaging-contacts.class.ts ──→ Service implementation
│
├── utils/
│   ├── [+] contact-aggregations.ts ──→ Aggregation pipelines
│   └── [+] role-filters.ts ──→ Role filtering
│
└── types/
    └── [+] messaging-contacts.types.ts ──→ Type definitions
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Role Detection

**What it does:**
Detects the authenticated user's role from the request params and determines which aggregation pipeline to use.

**Why added/changed:**
Different roles need different contact filtering logic - Students see classmates, Teachers see class students and fellow teachers, Admins see everyone.

**Implementation approach:**
```typescript
async find(params: Params): Promise<Contact[]> {
  const user = params.user;
  
  // Detect role from user object
  const role = user.role; // 'student' | 'teacher' | 'admin'
  
  // Route to appropriate handler
  switch(role) {
    case 'student':
      return this.getStudentContacts(user, params);
    case 'teacher':
      return this.getTeacherContacts(user, params);
    case 'admin':
      return this.getAdminContacts(user, params);
    default:
      throw new BadRequest('Invalid user role');
  }
}
```

### Logical Block 2: Student Contact Aggregation

**What it does:**
Fetches contacts for students - classmates from their enrolled classes and teachers teaching those classes.

**Why added/changed:**
Students should only see people they have legitimate educational relationships with.

**Implementation approach:**
```typescript
async getStudentContacts(user, params) {
  // Step 1: Get student's enrolled class IDs from classEnrollments
  const ClassEnrollments = app.service('class-enrollments');
  const enrollments = await ClassEnrollments.find({
    query: { studentId: user._id, status: 'Active' }
  });
  const classIds = enrollments.data.map(e => e.classId);
  
  // Step 2: Run aggregation to get classmates and teachers
  const contacts = await this.aggregateStudentContacts(user._id, classIds);
  
  return contacts;
}
```

### Logical Block 3: Teacher Contact Aggregation

**What it does:**
Fetches contacts for teachers - students from their teaching classes and all other teachers from the same school.

**Why added/changed:**
Teachers need to communicate with their students and collaborate with colleagues.

**Implementation approach:**
```typescript
async getTeacherContacts(user, params) {
  // Step 1: Get teacher's teaching class IDs from classTeachers
  const ClassTeachers = app.service('class-teachers');
  const assignments = await ClassTeachers.find({
    query: { teacherId: user._id, isActive: true }
  });
  const classIds = assignments.data.map(a => a.classId);
  
  // Step 2: Run aggregation for students + teachers
  const contacts = await this.aggregateTeacherContacts(
    user._id, 
    classIds, 
    user.schoolId
  );
  
  return contacts;
}
```

### Logical Block 4: Admin Contact Aggregation

**What it does:**
Fetches all users and classes for admin - complete system access.

**Why added/changed:**
Admins need to be able to message anyone in the system and broadcast to classes.

**Implementation approach:**
```typescript
async getAdminContacts(user, params) {
  // Step 1: Get all users (students and teachers)
  const contacts = await this.aggregateAdminContacts();
  
  return contacts;
}
```

## Code Changes

### In `services/messaging-contacts/messaging-contacts.class.ts`:

**Adding new service class:**
```typescript
import { Params } from '@feathersjs/feathers';
import { Application } from '../../declarations';
import { BadRequest } from '@feathersjs/errors';
import {
  getStudentContactsAggregation,
  getTeacherContactsAggregation,
  getAdminContactsAggregation
} from '../../utils/contact-aggregations';
import { Contact } from '../../types/messaging-contacts.types';

export class MessagingContactsService {
  app: Application;
  
  constructor(options: any, app: Application) {
    this.app = app;
  }

  async find(params: Params): Promise<Contact[]> {
    const user = params.user;
    if (!user) {
      throw new BadRequest('User not found in params');
    }

    const role = user.role;

    switch(role) {
      case 'student':
        return this.getStudentContacts(user, params);
      case 'teacher':
        return this.getTeacherContacts(user, params);
      case 'admin':
        return this.getAdminContacts(user, params);
      default:
        throw new BadRequest('Invalid user role');
    }
  }

  async getStudentContacts(user: any, params: Params): Promise<Contact[]> {
    const ClassEnrollments = this.app.service('class-enrollments');
    
    // Get student's enrolled classes
    const enrollments = await ClassEnrollments.find({
      query: { studentId: user._id, status: 'Active' }
    });
    const classIds = enrollments.data.map((e: any) => e.classId);

    // Run aggregation
    const ClassEnrollmentsModel = this.app.get('mongooseClient').models.classEnrollments;
    const contacts = await ClassEnrollmentsModel.aggregate(
      getStudentContactsAggregation(user._id, classIds)
    );

    return contacts;
  }

  async getTeacherContacts(user: any, params: Params): Promise<Contact[]> {
    const ClassTeachers = this.app.service('class-teachers');
    
    // Get teacher's classes
    const assignments = await ClassTeachers.find({
      query: { teacherId: user._id, isActive: true }
    });
    const classIds = assignments.data.map((a: any) => a.classId);

    // Run aggregation
    const ClassEnrollmentsModel = this.app.get('mongooseClient').models.classEnrollments;
    const contacts = await ClassEnrollmentsModel.aggregate(
      getTeacherContactsAggregation(user._id, classIds, user.schoolId)
    );

    return contacts;
  }

  async getAdminContacts(user: any, params: Params): Promise<Contact[]> {
    // Get all users
    const Users = this.app.get('mongooseClient').models.users;
    const contacts = await Users.aggregate(
      getAdminContactsAggregation(user._id)
    );

    return contacts;
  }
}
```

## Dependencies

- [+] `utils/contact-aggregations.ts` (Util) - Aggregation pipeline functions
- [+] `utils/role-filters.ts` (Util) - Role filtering logic
- [+] `messaging-contacts.types.ts` (Type) - TypeScript interfaces
- [~] `services/class-enrollments/class-enrollments.service.ts` (Service) - Get student's classes
- [~] `services/class-teachers/class-teachers.service.ts` (Service) - Get teacher's classes

## Models & Types

```typescript
// User (existing model)
interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  school?: string;
  avatar?: string;
}

// Contact (new type)
interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  school?: string;
}

// Query Parameters
interface MessagingContactsQuery {
  role?: 'student' | 'teacher' | 'admin'; // Admin can override role
  search?: string; // Search by name/email
}
```

## Error Codes

**Common Errors:**
- **400 BadRequest:** `'Invalid user role'` - Role not recognized
- **400 BadRequest:** `'User not found in params'` - Authentication missing
- **401 NotAuthenticated:** `'Authentication required'` - No JWT token
- **500 GeneralError:** `'Failed to fetch contacts'` - Aggregation failed
- **500 GeneralError:** `'Failed to enrich contacts'` - Enrichment failed

**Usage:**
```typescript
import { BadRequest, NotAuthenticated, GeneralError } from '@feathersjs/errors';

throw new BadRequest('Invalid user role');
throw new GeneralError('Failed to fetch contacts');
```

## Database Changes (if applicable)
- [ ] No database schema changes
- [ ] Requires indexes on existing collections for performance:
  - `users.role` (already exists)
  - `students.classes` (already exists)
  - `classes.teacherId` (already exists)
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

