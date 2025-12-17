# Messaging Contacts Service - Quick Reference

## Overview
The Messaging Contacts service provides role-based contact lists for the chat application.

## Endpoint

```
GET /messaging-contacts
```

## Authentication
**Required:** Yes (JWT token)

## Usage Examples

### Frontend Integration

```typescript
// Get contacts for current user
const getContacts = async () => {
  try {
    const response = await fetch('/messaging-contacts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    // data = { students: [], teachers: [], admins: [] }
    return data;
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
  }
};
```

### Using Feathers Client

```typescript
// Initialize Feathers client
import feathers from '@feathersjs/client';

const app = feathers();

// Get contacts grouped by role
const { students, teachers, admins } = await app.service('messaging-contacts').find();

// Use the grouped contacts
console.log(`${students.length} students`);
console.log(`${teachers.length} teachers`);
console.log(`${admins.length} admins`);
```

## Response Format

The API returns contacts **grouped by role**:

```typescript
{
  students: Contact[],
  teachers: Contact[],
  admins: Contact[]
}
```

### Contact Interface

```typescript
Contact = {
  _id: string,              // User ID (MongoDB ObjectId)
  firstName: string,        // User's first name
  lastName: string,         // User's last name
  email: string,           // User's email address
  role: "student" | "teacher" | "admin",  // User's role
  avatar?: string,         // Optional avatar URL
  school?: string          // Optional school ID
}
```

### Example Response

```json
{
  "students": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "role": "student",
      "avatar": "https://example.com/avatar.jpg",
      "school": "507f1f77bcf86cd799439012"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "sarah.j@example.com",
      "role": "student",
      "avatar": "https://example.com/avatar2.jpg",
      "school": "507f1f77bcf86cd799439012"
    }
  ],
  "teachers": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "role": "teacher",
      "avatar": "https://example.com/avatar3.jpg",
      "school": "507f1f77bcf86cd799439012"
    }
  ],
  "admins": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "firstName": "Michael",
      "lastName": "Anderson",
      "email": "michael.a@example.com",
      "role": "admin",
      "avatar": "https://example.com/avatar4.jpg",
      "school": "507f1f77bcf86cd799439012"
    }
  ]
}
```

## Role-Based Filtering

### What Students See:
- ✅ Classmates from enrolled classes
- ✅ Teachers teaching their classes
- ❌ Students from other classes
- ❌ Teachers from other schools

### What Teachers See:
- ✅ Students from their teaching classes
- ✅ Other teachers from same school
- ❌ Students from other teachers' classes (unless shared)
- ❌ Teachers from other schools

### What Admins See:
- ✅ All users in the system

## Admin Features

### Role Override (Admin Only)
Admins can test different role views:

```typescript
// View contacts as a student would see them
const studentContacts = await app.service('messaging-contacts').find({
  query: { role: 'Student' }
});

// View contacts as a teacher would see them
const teacherContacts = await app.service('messaging-contacts').find({
  query: { role: 'Teacher' }
});
```

**Note:** This feature is only available to users with 'Admin' role. Non-admin users will receive a 403 Forbidden error if they try to use role override.

## Error Handling

### Common Errors

```typescript
// 401 Not Authenticated
{
  name: 'NotAuthenticated',
  message: 'Not authenticated',
  code: 401
}

// 403 Forbidden (non-admin trying role override)
{
  name: 'Forbidden',
  message: 'Only admins can override role parameter',
  code: 403
}

// 400 Bad Request (invalid query parameter)
{
  name: 'BadRequest',
  message: 'Invalid query parameter: xyz',
  code: 400
}
```

### Error Handling Example

```typescript
try {
  const contacts = await app.service('messaging-contacts').find();
} catch (error) {
  if (error.code === 401) {
    // Redirect to login
    redirectToLogin();
  } else if (error.code === 403) {
    // Show permission error
    showPermissionError();
  } else {
    // Show generic error
    showError('Failed to load contacts');
  }
}
```

## Integration with Chat UI

### Example: Contact List Component

```typescript
import React, { useEffect, useState } from 'react';

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string;
}

interface GroupedContacts {
  students: Contact[];
  teachers: Contact[];
  admins: Contact[];
}

const ContactList: React.FC = () => {
  const [contacts, setContacts] = useState<GroupedContacts>({
    students: [],
    teachers: [],
    admins: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const result = await app.service('messaging-contacts').find();
        // result = { students: [], teachers: [], admins: [] }
        setContacts(result);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  if (loading) return <div>Loading contacts...</div>;

  return (
    <div className="contact-list">
      {/* Students Section */}
      {contacts.students.length > 0 && (
        <div className="section">
          <h3>Students ({contacts.students.length})</h3>
          {contacts.students.map(contact => (
            <div key={contact._id} className="contact-item">
              <img src={contact.avatar || '/default-avatar.png'} alt={contact.firstName} />
              <div>
                <h4>{contact.firstName} {contact.lastName}</h4>
                <p>{contact.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teachers Section */}
      {contacts.teachers.length > 0 && (
        <div className="section">
          <h3>Teachers ({contacts.teachers.length})</h3>
          {contacts.teachers.map(contact => (
            <div key={contact._id} className="contact-item">
              <img src={contact.avatar || '/default-avatar.png'} alt={contact.firstName} />
              <div>
                <h4>{contact.firstName} {contact.lastName}</h4>
                <p>{contact.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admins Section */}
      {contacts.admins.length > 0 && (
        <div className="section">
          <h3>Admins ({contacts.admins.length})</h3>
          {contacts.admins.map(contact => (
            <div key={contact._id} className="contact-item">
              <img src={contact.avatar || '/default-avatar.png'} alt={contact.firstName} />
              <div>
                <h4>{contact.firstName} {contact.lastName}</h4>
                <p>{contact.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Performance Considerations

### Caching
Consider caching contact lists on the frontend:

```typescript
// Cache contacts for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedContacts: GroupedContacts | null = null;
let cacheTime: number | null = null;

interface GroupedContacts {
  students: Contact[];
  teachers: Contact[];
  admins: Contact[];
}

const getContacts = async (): Promise<GroupedContacts> => {
  const now = Date.now();
  
  if (cachedContacts && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return cachedContacts;
  }
  
  const contacts = await app.service('messaging-contacts').find();
  // contacts = { students: [], teachers: [], admins: [] }
  cachedContacts = contacts;
  cacheTime = now;
  
  return contacts;
};
```

### Refresh Strategy
Refresh contacts when:
- ✅ User first opens chat interface
- ✅ User switches between roles (if admin)
- ✅ Significant time has passed (>5 minutes)
- ❌ Don't refresh on every message sent/received

## Backend Usage

### Using in Other Services

```typescript
import { Application } from '../declarations';

// Get contacts for a specific user
const getUserContacts = async (userId: string, app: Application) => {
  // Get user
  const user = await app.service('users').get(userId);
  
  // Get contacts (service will handle role-based filtering)
  const contacts = await app.service('messaging-contacts').find({
    user: user,  // Pass user in params
    provider: undefined  // Internal call
  });
  
  return contacts;
};
```

### Permission Checking

```typescript
import { canContactUser } from '../utils/role-filters';

// Check if user can contact another user
const canContact = await canContactUser(
  fromUserId,
  toUserId,
  app
);

if (!canContact) {
  throw new Forbidden('You cannot contact this user');
}
```

## Testing

### Manual Testing with cURL

```bash
# Get contacts as authenticated user
curl -X GET http://localhost:3030/messaging-contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Admin: Get contacts with role override
curl -X GET "http://localhost:3030/messaging-contacts?role=Student" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Testing with Postman

1. Create a new GET request to `/messaging-contacts`
2. Add Authorization header: `Bearer YOUR_JWT_TOKEN`
3. (Optional for admins) Add query parameter: `role=Student`
4. Send request
5. Verify response contains contact list

## Troubleshooting

### No Contacts Returned
**Issue:** Empty array returned

**Possible Causes:**
1. Student not enrolled in any classes
2. Teacher not assigned to any classes
3. School filter excluding all contacts
4. Database connection issues

**Solution:**
```typescript
// Check class enrollments
const enrollments = await app.service('class-enrollments').find({
  query: { studentId: userId, status: 'Active' }
});

// Check class teacher assignments
const assignments = await app.service('class-teachers').find({
  query: { teacherId: userId, isActive: true }
});
```

### 403 Forbidden Error
**Issue:** Permission denied

**Possible Causes:**
1. Non-admin trying to use role override
2. Invalid JWT token
3. Token expired

**Solution:**
- Verify user role is 'Admin' for role override
- Check JWT token expiration
- Re-authenticate if needed

### Duplicate Contacts
**Issue:** Same contact appears multiple times

**Possible Causes:**
- Student enrolled in multiple classes with same teacher
- Database aggregation not deduplicating properly

**Solution:**
- Check aggregation pipeline has `$group` stage
- Verify `_id` field is being used for deduplication

## Related Documentation

- [Phase 2 Implementation Summary](../../PHASE_2_MESSAGING_CONTACTS_IMPLEMENTATION.md)
- [Phase 2 Planning Documents](../../ryland-lms-api/plans/chat-application/phase-2-messaging-contacts/)
- [Phase 1 Chat Implementation](../../ryland-lms-api/docs/chat-application/)

## Support

For issues or questions:
1. Check error messages and logs
2. Review this quick reference
3. Check implementation files for detailed comments
4. Review Phase 2 planning documents

---

**Last Updated:** December 16, 2025

