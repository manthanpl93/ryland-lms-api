# Change 4: Util - contact-aggregations.ts

**Type:** Util  
**File:** contact-aggregations.ts  
**Location:** `src/utils/contact-aggregations.ts`  
**Status:** [+] Added

[← Back to API Design Overview](../3-api-design.md)

---

## Changes Summary

Creates MongoDB aggregation pipeline functions for role-based contact fetching:
- `getStudentContactsAggregation()` - Aggregates classmates and teachers for students
- `getTeacherContactsAggregation()` - Aggregates class students and fellow teachers
- `getAdminContactsAggregation()` - Aggregates all users for admins

Each aggregation returns user data (name, email, avatar, role) optimized with proper $lookup and $match stages.

## Affected Files

```
src/
├── utils/
│   └── [+] contact-aggregations.ts ──→ Aggregation pipelines
│
├── models/
│   ├── [~] users.model.ts ──→ Existing user model
│   ├── [~] class-enrollments.model.ts ──→ Student-class relationships
│   └── [~] class-teachers.model.ts ──→ Teacher-class relationships
│
└── services/
    └── messaging-contacts/
        └── [~] messaging-contacts.class.ts ──→ Uses aggregations
```

**Legend:** [+] New, [~] Modified, [-] Deleted

## Logic/Implementation

### Logical Block 1: Student Contacts Aggregation

**What it does:**
Creates an aggregation pipeline that fetches all classmates (other students in the same classes) and teachers teaching those classes.

**Why added/changed:**
Students need to see only people from their enrolled classes for communication.

**Implementation approach:**
```typescript
// Pipeline steps:
// 1. Start from classEnrollments collection
// 2. Match enrollments for the student's classes (exclude self)
// 3. Lookup user details for classmates
// 4. Union with teachers from classTeachers collection
// 5. Lookup user details for teachers
// 6. Deduplicate and project necessary fields

export const getStudentContactsAggregation = (
  userId: string, 
  classIds: string[]
) => {
  return [
    // Match classmates in same classes (excluding self)
    {
      $match: {
        classId: { $in: classIds },
        studentId: { $ne: userId },
        status: 'Active'
      }
    },
    // Lookup user details for classmates
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    // Project user fields
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        role: '$user.role',
        avatar: '$user.avatar',
        schoolId: '$user.schoolId'
      }
    },
    // Union with teachers from classTeachers
    {
      $unionWith: {
        coll: 'classTeachers',
        pipeline: [
          { 
            $match: { 
              classId: { $in: classIds },
              isActive: true
            } 
          },
          {
            $lookup: {
              from: 'users',
              localField: 'teacherId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              _id: '$user._id',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              email: '$user.email',
              role: '$user.role',
              avatar: '$user.avatar',
              schoolId: '$user.schoolId'
            }
          }
        ]
      }
    },
    // Remove duplicates (in case of multiple classes)
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        avatar: { $first: '$avatar' },
        schoolId: { $first: '$schoolId' }
      }
    }
  ];
};
```

### Logical Block 2: Teacher Contacts Aggregation

**What it does:**
Creates an aggregation pipeline that fetches all students from teacher's classes and all other teachers from the same school.

**Why added/changed:**
Teachers need to communicate with their students and collaborate with colleagues.

**Implementation approach:**
```typescript
export const getTeacherContactsAggregation = (
  userId: string,
  classIds: string[],
  schoolId: string
) => {
  return [
    // Get students enrolled in teacher's classes
    {
      $match: {
        classId: { $in: classIds },
        status: 'Active'
      }
    },
    // Lookup student user details
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    // Project user fields
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        role: '$user.role',
        avatar: '$user.avatar',
        schoolId: '$user.schoolId'
      }
    },
    // Union with other teachers from same school
    {
      $unionWith: {
        coll: 'users',
        pipeline: [
          {
            $match: {
              role: 'Teacher',
              schoolId: schoolId,
              _id: { $ne: userId } // Exclude self
            }
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              role: 1,
              avatar: 1,
              schoolId: 1
            }
          }
        ]
      }
    },
    // Remove duplicates
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        avatar: { $first: '$avatar' },
        schoolId: { $first: '$schoolId' }
      }
    }
  ];
};
```

### Logical Block 3: Admin Contacts Aggregation

**What it does:**
Creates an aggregation pipeline that fetches all users (students, teachers, admins) and optionally classes for broadcast messaging.

**Why added/changed:**
Admins need system-wide access to communicate with anyone.

**Implementation approach:**
```typescript
export const getAdminContactsAggregation = (userId: string) => {
  return [
    // Get all users except self
    {
      $match: {
        _id: { $ne: userId }
      }
    },
    // Project necessary fields
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        avatar: 1,
        school: 1
      }
    },
    // Sort by role then name
    {
      $sort: {
        role: 1,
        firstName: 1,
        lastName: 1
      }
    }
  ];
};
```

## Code Changes

### In `utils/contact-aggregations.ts`:

**Adding new utility file:**
```typescript
import { Types } from 'mongoose';

/**
 * Get contacts for a student (classmates + teachers)
 * Runs on classEnrollments collection
 */
export const getStudentContactsAggregation = (
  userId: string,
  classIds: string[]
): any[] => {
  const objectIdClassIds = classIds.map(id => new Types.ObjectId(id));
  const objectIdUserId = new Types.ObjectId(userId);

  return [
    // Match classmates in same classes (excluding self)
    {
      $match: {
        classId: { $in: objectIdClassIds },
        studentId: { $ne: objectIdUserId },
        status: 'Active'
      }
    },
    // Lookup user details for classmates
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    // Project user fields
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        role: '$user.role',
        avatar: '$user.avatar',
        schoolId: '$user.schoolId'
      }
    },
    // Union with teachers from classTeachers
    {
      $unionWith: {
        coll: 'classTeachers',
        pipeline: [
          { 
            $match: { 
              classId: { $in: objectIdClassIds },
              isActive: true
            } 
          },
          {
            $lookup: {
              from: 'users',
              localField: 'teacherId',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              _id: '$user._id',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              email: '$user.email',
              role: '$user.role',
              avatar: '$user.avatar',
              schoolId: '$user.schoolId'
            }
          }
        ]
      }
    },
    // Deduplicate
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        avatar: { $first: '$avatar' },
        schoolId: { $first: '$schoolId' }
      }
    }
  ];
};

/**
 * Get contacts for a teacher (class students + fellow teachers)
 * Runs on classEnrollments collection
 */
export const getTeacherContactsAggregation = (
  userId: string,
  classIds: string[],
  schoolId: string
): any[] => {
  const objectIdClassIds = classIds.map(id => new Types.ObjectId(id));
  const objectIdUserId = new Types.ObjectId(userId);
  const objectIdSchoolId = new Types.ObjectId(schoolId);

  return [
    // Get students enrolled in teacher's classes
    {
      $match: {
        classId: { $in: objectIdClassIds },
        status: 'Active'
      }
    },
    // Lookup student user details
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    // Project user fields
    {
      $project: {
        _id: '$user._id',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        email: '$user.email',
        role: '$user.role',
        avatar: '$user.avatar',
        schoolId: '$user.schoolId'
      }
    },
    // Union with other teachers from same school
    {
      $unionWith: {
        coll: 'users',
        pipeline: [
          {
            $match: {
              role: 'Teacher',
              schoolId: objectIdSchoolId,
              _id: { $ne: objectIdUserId }
            }
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              role: 1,
              avatar: 1,
              schoolId: 1
            }
          }
        ]
      }
    },
    // Deduplicate
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        email: { $first: '$email' },
        role: { $first: '$role' },
        avatar: { $first: '$avatar' },
        schoolId: { $first: '$schoolId' }
      }
    }
  ];
};

/**
 * Get contacts for an admin (all users)
 * Runs on users collection
 */
export const getAdminContactsAggregation = (userId: string): any[] => {
  const objectIdUserId = new Types.ObjectId(userId);

  return [
    {
      $match: {
        _id: { $ne: objectIdUserId }
      }
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        avatar: 1,
        schoolId: 1
      }
    },
    {
      $sort: {
        role: 1,
        firstName: 1,
        lastName: 1
      }
    }
  ];
};
```

## Dependencies

- [~] `mongoose` (Package) - For Types.ObjectId conversion
- [~] `users.model.ts` (Model) - User data source
- [~] `class-enrollments.model.ts` (Model) - Student-class relationships
- [~] `class-teachers.model.ts` (Model) - Teacher-class relationships

## Models & Types

```typescript
// Aggregation Input Types
interface StudentContactsParams {
  userId: string;
  classIds: string[];
}

interface TeacherContactsParams {
  userId: string;
  classIds: string[];
  schoolId: string;
}

interface AdminContactsParams {
  userId: string;
}

// Aggregation Output Type
interface AggregatedContact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Teacher' | 'Admin' | string; // Role from users model
  avatar?: string;
  schoolId?: string;
}
```

## Error Codes

**No direct errors** - These are pure utility functions. Errors will be handled by the calling service.

## Database Changes (if applicable)
- [ ] No schema changes
- [ ] Requires existing indexes:
  - `classEnrollments.classId` (index) - already exists
  - `classEnrollments.studentId` (index) - already exists
  - `classTeachers.classId` (index) - already exists
  - `classTeachers.teacherId` (index) - already exists
  - `users.role` (index) - may need to add
  - `users.schoolId` (index) - already exists
- [ ] No migration needed

---

[← Back to API Design Overview](../3-api-design.md)

