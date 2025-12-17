# Change 5: Util - role-filters.ts

**Type:** Util  
**File:** role-filters.ts  
**Location:** `src/utils/role-filters.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Creates utility functions for role-based filtering and permission checking:
- `canContactUser()` - Determines if user A can contact user B based on their relationships
- `getSchoolFilter()` - Returns school-based filter for multi-tenancy
- `getRoleBasedQuery()` - Constructs MongoDB query based on user role

These utilities ensure proper access control and relationship validation.

## Affected Files

```
src/
├── utils/
│   └── [+] role-filters.ts ──→ Role filtering utilities
│
└── services/
    └── messaging-contacts/
        └── [~] messaging-contacts.class.ts ──→ Uses role filters
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Contact Permission Check

**What it does:**
Validates if one user has permission to contact another based on their roles and relationships.

**Why added/changed:**
Prevent unauthorized contact initiation (e.g., student messaging someone outside their classes).

**Implementation approach:**
```typescript
export const canContactUser = async (
  fromUserId: string,
  toUserId: string,
  app: Application
): Promise<boolean> => {
  // Get both users
  const usersService = app.service('users');
  const fromUser = await usersService.get(fromUserId);
  const toUser = await usersService.get(toUserId);
  
  // Admin can contact anyone
  if (fromUser.role === 'admin') return true;
  
  // Check role-specific permissions
  if (fromUser.role === 'student') {
    return canStudentContact(fromUser, toUser, app);
  }
  
  if (fromUser.role === 'teacher') {
    return canTeacherContact(fromUser, toUser, app);
  }
  
  return false;
};
```

### Logical Block 2: Student Contact Validation

**What it does:**
Validates if a student can contact another user (must be classmate or class teacher).

**Why added/changed:**
Students should only contact people from their enrolled classes.

**Implementation approach:**
```typescript
const canStudentContact = async (
  student: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  // Get student's classes
  const studentsService = app.service('students');
  const studentDoc = await studentsService.find({
    query: { userId: student._id }
  });
  
  const studentClasses = studentDoc.data[0]?.classes || [];
  
  // Check if target is a classmate
  if (targetUser.role === 'student') {
    const targetStudentDoc = await studentsService.find({
      query: { userId: targetUser._id }
    });
    const targetClasses = targetStudentDoc.data[0]?.classes || [];
    
    // Check for common classes
    const hasCommonClass = studentClasses.some((classId: any) =>
      targetClasses.some((tc: any) => tc.toString() === classId.toString())
    );
    
    return hasCommonClass;
  }
  
  // Check if target is a teacher of student's classes
  if (targetUser.role === 'teacher') {
    const classesService = app.service('classes');
    const teacherClasses = await classesService.find({
      query: {
        _id: { $in: studentClasses },
        teacherId: targetUser._id
      }
    });
    
    return teacherClasses.total > 0;
  }
  
  return false;
};
```

### Logical Block 3: Teacher Contact Validation

**What it does:**
Validates if a teacher can contact another user (must be class student or fellow teacher from same school).

**Why added/changed:**
Teachers should contact their students and colleagues only.

**Implementation approach:**
```typescript
const canTeacherContact = async (
  teacher: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  // Get teacher's classes
  const classesService = app.service('classes');
  const teacherClasses = await classesService.find({
    query: { teacherId: teacher._id }
  });
  const classIds = teacherClasses.data.map((c: any) => c._id);
  
  // Check if target is a student in teacher's class
  if (targetUser.role === 'student') {
    const studentsService = app.service('students');
    const targetStudentDoc = await studentsService.find({
      query: {
        userId: targetUser._id,
        classes: { $in: classIds }
      }
    });
    
    return targetStudentDoc.total > 0;
  }
  
  // Check if target is a teacher from same school
  if (targetUser.role === 'teacher') {
    return teacher.school === targetUser.school;
  }
  
  return false;
};
```

### Logical Block 4: School Filter Generation

**What it does:**
Generates MongoDB filter for school-based multi-tenancy.

**Why added/changed:**
Non-admin users should only see contacts from their school.

**Implementation approach:**
```typescript
export const getSchoolFilter = (user: any): any => {
  // Admins have no school filter
  if (user.role === 'admin') {
    return {};
  }
  
  // Non-admins filter by school
  if (user.school) {
    return { school: user.school };
  }
  
  return {};
};
```

## Code Changes

### In `utils/role-filters.ts`:

**Adding new utility file:**
```typescript
import { Application } from '../declarations';

/**
 * Check if fromUser can contact toUser
 */
export const canContactUser = async (
  fromUserId: string,
  toUserId: string,
  app: Application
): Promise<boolean> => {
  const usersService = app.service('users');
  
  const fromUser = await usersService.get(fromUserId);
  const toUser = await usersService.get(toUserId);
  
  // Admin can contact anyone
  if (fromUser.role === 'admin') return true;
  
  // Route to role-specific validation
  if (fromUser.role === 'student') {
    return canStudentContact(fromUser, toUser, app);
  }
  
  if (fromUser.role === 'teacher') {
    return canTeacherContact(fromUser, toUser, app);
  }
  
  return false;
};

/**
 * Student contact validation
 */
const canStudentContact = async (
  student: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  const studentsService = app.service('students');
  
  // Get student's classes
  const studentDoc = await studentsService.find({
    query: { userId: student._id }
  });
  const studentClasses = studentDoc.data[0]?.classes || [];
  
  // Check if target is classmate
  if (targetUser.role === 'student') {
    const targetStudentDoc = await studentsService.find({
      query: { userId: targetUser._id }
    });
    const targetClasses = targetStudentDoc.data[0]?.classes || [];
    
    // Check for common classes
    const hasCommonClass = studentClasses.some((classId: any) =>
      targetClasses.some((tc: any) => tc.toString() === classId.toString())
    );
    
    return hasCommonClass;
  }
  
  // Check if target is teacher of student's classes
  if (targetUser.role === 'teacher') {
    const classesService = app.service('classes');
    const teacherClasses = await classesService.find({
      query: {
        _id: { $in: studentClasses },
        teacherId: targetUser._id
      }
    });
    
    return teacherClasses.total > 0;
  }
  
  return false;
};

/**
 * Teacher contact validation
 */
const canTeacherContact = async (
  teacher: any,
  targetUser: any,
  app: Application
): Promise<boolean> => {
  const classesService = app.service('classes');
  
  // Get teacher's classes
  const teacherClasses = await classesService.find({
    query: { teacherId: teacher._id }
  });
  const classIds = teacherClasses.data.map((c: any) => c._id);
  
  // Check if target is student in teacher's class
  if (targetUser.role === 'student') {
    const studentsService = app.service('students');
    const targetStudentDoc = await studentsService.find({
      query: {
        userId: targetUser._id,
        classes: { $in: classIds }
      }
    });
    
    return targetStudentDoc.total > 0;
  }
  
  // Check if target is teacher from same school
  if (targetUser.role === 'teacher') {
    return teacher.school === targetUser.school;
  }
  
  return false;
};

/**
 * Get school filter for multi-tenancy
 */
export const getSchoolFilter = (user: any): any => {
  if (user.role === 'admin') {
    return {}; // No filter for admins
  }
  
  if (user.school) {
    return { school: user.school };
  }
  
  return {};
};

/**
 * Get role-based MongoDB query
 */
export const getRoleBasedQuery = (user: any): any => {
  const baseQuery: any = {};
  
  // Add school filter for non-admins
  if (user.role !== 'admin' && user.school) {
    baseQuery.school = user.school;
  }
  
  return baseQuery;
};
```

## Dependencies

- [~] `services/users/users.service.ts` (Service) - User lookup
- [~] `services/students/students.service.ts` (Service) - Student data
- [~] `services/classes/classes.service.ts` (Service) - Class data
- [~] `declarations.ts` (Type) - Application type

## Models & Types

```typescript
// User Type (from existing model)
interface User {
  _id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  school?: string;
}

// School Filter Type
interface SchoolFilter {
  school?: string;
}

// Contact Permission Result
interface ContactPermissionResult {
  canContact: boolean;
  reason?: string;
}
```

## Error Codes

**These utilities don't throw errors directly** - They return boolean values for permission checks. Calling services should handle unauthorized access:

- **403 Forbidden:** `'Cannot contact this user'` - Used when `canContactUser()` returns false

**Usage in calling service:**
```typescript
import { Forbidden } from '@feathersjs/errors';

const canContact = await canContactUser(fromId, toId, app);
if (!canContact) {
  throw new Forbidden('Cannot contact this user');
}
```

## Database Changes (if applicable)
- [ ] No schema changes
- [ ] No new indexes needed (relies on existing)
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

