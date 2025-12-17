# Messaging Contacts Service

## Overview

The **Messaging Contacts Service** is a dedicated endpoint that provides role-based contact lists for the chat application. The service intelligently filters contacts based on user roles (Student, Teacher, Admin) and their relationships within the LMS system.

## Purpose

The chat application enables users to send messages, but they need a way to **discover who they should be able to message** based on their educational relationships. The contacts service solves this by:

1. Providing a curated list of contacts based on role and relationships
2. Ensuring students only see classmates and their teachers
3. Enabling teachers to message their students and colleagues
4. Giving admins system-wide access

## Architecture

```
┌─────────────────┐
│  Client Request │
│  GET /messaging │
│     -contacts   │
└────────┬────────┘
         │
         ▼
┌────────────────────────┐
│ Messaging Contacts     │
│ Service                │
│                        │
│ 1. Authenticate User   │
│ 2. Detect Role         │
│ 3. Route to Handler    │
└────────┬───────────────┘
         │
    ┌────┴────┬─────────┬────────┐
    │         │         │        │
    ▼         ▼         ▼        ▼
┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐
│Student │ │Teacher │ │Admin │ │Class │
│Handler │ │Handler │ │Handler│ │Models│
└───┬────┘ └───┬────┘ └──┬───┘ └──────┘
    │          │          │
    │          │          │
    ▼          ▼          ▼
┌──────────────────────────────┐
│  MongoDB Aggregation         │
│  - Class Enrollments         │
│  - Class Teachers            │
│  - Users                     │
└────────┬─────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Contact List Response │
│  (Filtered & Enriched) │
└────────────────────────┘
```

## Role-Based Filtering Logic

### Students See:

**Classmates:**
- Other students enrolled in the same classes
- Must have "Active" enrollment status
- Excludes self

**Teachers:**
- Teachers assigned to their enrolled classes
- Must have active teacher assignment (`isActive: true`)

**Example:**
```
Student Alice is enrolled in:
- Math 101 (with Teacher Bob)
- Science 201 (with Teacher Carol)

Alice's contacts:
- Students in Math 101 + Science 201 (classmates)
- Teacher Bob
- Teacher Carol
```

### Teachers See:

**Students:**
- Students enrolled in classes they teach
- Must have "Active" enrollment status

**Fellow Teachers:**
- All other teachers from the same school
- School-aware filtering for multi-tenancy
- Excludes self

**Example:**
```
Teacher Bob teaches:
- Math 101 (has students: Alice, David, Emma)
- Math 102 (has students: Frank, Grace)
- School: Lincoln High

Bob's contacts:
- Alice, David, Emma, Frank, Grace (students)
- All other teachers at Lincoln High
```

### Admins See:

**Everyone:**
- All users in the entire system
- Students, Teachers, and other Admins
- No school filtering
- Excludes self
- Sorted by role, then name

## Implementation Details

### Service Structure

```
src/services/messaging-contacts/
├── messaging-contacts.service.ts    # Service registration
├── messaging-contacts.class.ts      # Service class with handlers
└── messaging-contacts.hooks.ts      # Authentication & validation
```

### Utility Functions

```
src/utils/
├── contact-aggregations.ts          # MongoDB aggregation pipelines
└── role-filters.ts                  # Permission validation utilities
```

### Type Definitions

```
src/types/
└── messaging-contacts.types.ts      # TypeScript interfaces
```

### Service Class

The `MessagingContactsService` class implements three main methods:

```typescript
class MessagingContactsService {
  // Main entry point - routes based on role
  find(params: Params): Promise<Contact[]>
  
  // Handler for student contacts
  getStudentContacts(user: any): Promise<Contact[]>
  
  // Handler for teacher contacts
  getTeacherContacts(user: any): Promise<Contact[]>
  
  // Handler for admin contacts
  getAdminContacts(user: any): Promise<Contact[]>
}
```

### MongoDB Aggregations

Each role uses optimized aggregation pipelines:

**Student Aggregation:**
1. Start from `classEnrollments` collection
2. Match student's enrolled classes (exclude self)
3. Lookup user details for classmates
4. Union with teachers from `classTeachers` collection
5. Deduplicate using `$group`

**Teacher Aggregation:**
1. Start from `classEnrollments` collection
2. Match students in teacher's classes
3. Lookup student user details
4. Union with all teachers from same school
5. Deduplicate using `$group`

**Admin Aggregation:**
1. Query `users` collection
2. Match all users except self
3. Sort by role, then name

### Performance Optimizations

✅ **Direct Model Access:**
- Uses Mongoose models directly instead of service layer
- Eliminates service overhead

✅ **Selective Field Fetching:**
- Uses `.select()` to fetch only needed fields
- Reduces data transfer and memory usage

✅ **Lean Queries:**
- Uses `.lean()` to return plain JavaScript objects
- Faster than full Mongoose documents

✅ **Database-Level Deduplication:**
- Uses `$group` in aggregation pipeline
- Eliminates duplicates at database level

✅ **Index Utilization:**
- Leverages existing indexes on:
  - `classEnrollments.studentId`
  - `classEnrollments.classId`
  - `classTeachers.teacherId`
  - `classTeachers.classId`
  - `users.schoolId`

## API Usage

### Basic Usage

```javascript
// Feathers client
const contacts = await app.service('messaging-contacts').find();

// REST API
const response = await fetch('/messaging-contacts', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
const contacts = await response.json();
```

### Admin Role Override

Admins can test different role views:

```javascript
// View contacts as a student
const studentContacts = await app.service('messaging-contacts').find({
  query: { role: 'Student' }
});

// View contacts as a teacher
const teacherContacts = await app.service('messaging-contacts').find({
  query: { role: 'Teacher' }
});
```

### Response Format

```typescript
Contact[] = [
  {
    _id: string,              // User ID
    firstName: string,        // User's first name
    lastName: string,         // User's last name
    email: string,            // User's email
    role: 'Student' | 'Teacher' | 'Admin',
    avatar?: string,          // Avatar URL (optional)
    schoolId?: string         // School ID (for multi-tenancy)
  }
]
```

## Security Features

### Authentication
- ✅ JWT authentication required on all requests
- ✅ User automatically extracted from token
- ✅ No anonymous access

### Authorization
- ✅ Role-based filtering enforced at database level
- ✅ Students cannot see users outside their classes
- ✅ Teachers cannot see students from other teachers' classes
- ✅ School-aware filtering for multi-tenancy
- ✅ Admin role override validation

### Query Validation
- ✅ Only allowed query parameters accepted
- ✅ Role parameter restricted to admins
- ✅ Invalid parameters rejected with 400 error

### School Isolation
- ✅ Non-admins only see contacts from their school
- ✅ `schoolId` automatically applied to queries
- ✅ Prevents cross-school data leaks

## Multi-Tenancy Support

The service is **school-aware** for multi-tenant deployments:

```typescript
// Automatic school filtering for non-admins
if (user.role !== 'Admin' && user.schoolId) {
  // Only return contacts from user's school
  context.params.schoolFilter = {
    schoolId: user.schoolId
  };
}
```

**Benefits:**
- Multiple schools can use the same system
- Data isolation between schools
- No configuration needed (automatic)

## Integration with Core Messaging

The contacts service complements the core messaging features by providing **contact discovery**:

### Workflow:

1. **User opens chat interface**
   - Frontend calls `GET /messaging-contacts`
   - Service returns filtered contact list

2. **User selects a contact**
   - Frontend checks if conversation exists
   - Calls `GET /conversations` to fetch/create conversation

3. **User sends message**
   - Frontend uses socket events
   - `message:send` event via WebSocket

### Data Flow:

```
┌─────────────┐
│   User      │
│ Opens Chat  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Contacts:        │
│ Get Contacts     │ ────► Contact List
└──────┬───────────┘
       │
       │ User selects contact
       ▼
┌──────────────────┐
│ Conversations:   │
│ Get/Create       │ ────► Conversation
│ Conversation     │
└──────┬───────────┘
       │
       │ User types message
       ▼
┌──────────────────┐
│ Messages:        │
│ Send Message     │ ────► Message delivered
│ via WebSocket    │
└──────────────────┘
```

## Testing

### Manual Testing

```bash
# 1. Test as student
curl -X GET http://localhost:3030/messaging-contacts \
  -H "Authorization: Bearer STUDENT_JWT"
# Should return classmates + teachers only

# 2. Test as teacher
curl -X GET http://localhost:3030/messaging-contacts \
  -H "Authorization: Bearer TEACHER_JWT"
# Should return class students + fellow teachers

# 3. Test as admin
curl -X GET http://localhost:3030/messaging-contacts \
  -H "Authorization: Bearer ADMIN_JWT"
# Should return all users

# 4. Test admin role override
curl -X GET "http://localhost:3030/messaging-contacts?role=Student" \
  -H "Authorization: Bearer ADMIN_JWT"
# Should return contacts as if admin were a student
```

### Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Student with no enrollments | Empty array |
| Student enrolled in 1 class | Classmates + 1 teacher |
| Student enrolled in 3 classes | All classmates + all 3 teachers (deduplicated) |
| Teacher with no class assignments | Only fellow teachers from school |
| Teacher teaching 2 classes | All students from both classes + fellow teachers |
| Admin | All users in system (sorted by role) |
| Non-admin tries role override | 403 Forbidden error |
| Invalid role parameter | 400 Bad Request error |
| Missing authentication | 401 Not Authenticated error |

## Performance Benchmarks

Expected performance with typical data sizes:

| Scenario | Records | Response Time |
|----------|---------|---------------|
| Student (50 classmates, 5 teachers) | 55 | < 100ms |
| Teacher (200 students, 30 teachers) | 230 | < 200ms |
| Admin (5000 users) | 5000 | < 500ms |

**Optimization Tips:**
- Results are not paginated (returns all contacts)
- Consider caching on frontend for 5+ minutes
- Refresh only on significant events (new enrollment, class change)

## Error Handling

### Common Errors

```typescript
// 400 Bad Request - Invalid query parameter
{
  name: 'BadRequest',
  message: 'Invalid query parameter: xyz',
  code: 400
}

// 401 Not Authenticated - Missing JWT
{
  name: 'NotAuthenticated',
  message: 'Not authenticated',
  code: 401
}

// 403 Forbidden - Non-admin role override
{
  name: 'Forbidden',
  message: 'Only admins can override role parameter',
  code: 403
}

// 400 Bad Request - Invalid role
{
  name: 'BadRequest',
  message: 'Invalid user role',
  code: 400
}
```

## Future Enhancements

### Search Functionality
Add text search by name or email:
```typescript
GET /messaging-contacts?search=john
```

### Pagination
Add pagination for large contact lists:
```typescript
GET /messaging-contacts?$limit=50&$skip=0
```

### Contact Enrichment
Add real-time data to contacts:
- Online/offline status (from connection-manager)
- Unread message count
- Last message preview
- Last activity timestamp

### Class Broadcast (Admin)
Enable admins to broadcast to entire classes:
```typescript
GET /messaging-contacts?type=classes
// Returns list of classes for broadcasting
```

### Caching Layer
Add Redis caching for frequently accessed contacts:
- Cache contacts for 5 minutes
- Invalidate on enrollment/assignment changes
- Reduce database load

## Troubleshooting

### No contacts returned

**Possible causes:**
1. Student not enrolled in any classes
2. Teacher not assigned to any classes
3. Database connection issue
4. Incorrect school filtering

**Solution:**
```bash
# Check enrollments
db.classEnrollments.find({ 
  studentId: ObjectId("USER_ID"),
  status: "Active"
})

# Check teacher assignments
db.classTeachers.find({ 
  teacherId: ObjectId("USER_ID"),
  isActive: true
})
```

### Duplicate contacts appearing

**Possible causes:**
1. Aggregation not deduplicating properly
2. Multiple enrollments in same class

**Solution:**
- Check aggregation pipeline has `$group` stage
- Verify `_id` field is used for grouping

### Slow response times

**Possible causes:**
1. Missing database indexes
2. Large number of contacts
3. No frontend caching

**Solution:**
```bash
# Add indexes if missing
db.classEnrollments.createIndex({ studentId: 1, classId: 1 })
db.classTeachers.createIndex({ teacherId: 1, classId: 1 })
db.users.createIndex({ schoolId: 1, role: 1 })

# Enable frontend caching
# Cache contacts for 5 minutes
```

## Related Documentation

- [Implementation Summary](../../../PHASE_2_MESSAGING_CONTACTS_IMPLEMENTATION.md)
- [Quick Reference Guide](../messaging-contacts-quick-reference.md)
- [API Reference](./api-reference.md)
- [Architecture](./architecture.md)
- [Chat Application Overview](./README.md)

## Support

For questions or issues:
1. Review this documentation
2. Check the implementation summary
3. Review test scenarios
4. Check error messages and logs

---

**Version:** 1.0.0  
**Last Updated:** December 16, 2025  
**Status:** ✅ Implemented and Tested

