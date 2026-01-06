# Chat Application API Reference

## REST API Endpoints

All REST API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Conversations API

Base path: `/conversations`

### List Conversations

Retrieve all conversations for the authenticated user, sorted by most recent activity.

**Endpoint:** `GET /conversations`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `$limit` | number | No | 50 | Maximum number of results |
| `$skip` | number | No | 0 | Number of results to skip |
| `$sort[lastMessageAt]` | number | No | -1 | Sort order (1=asc, -1=desc) |

**Response:**

```json
{
  "total": 10,
  "limit": 50,
  "skip": 0,
  "data": [
    {
      "_id": "conv123",
      "participants": [
        {
          "_id": "user1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "avatar": "https://..."
        },
        {
          "_id": "user2",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com",
          "avatar": "https://..."
        }
      ],
      "lastMessage": {
        "content": "Hello, how are you?",
        "senderId": "user1",
        "timestamp": "2025-12-16T10:30:00.000Z"
      },
      "lastMessageAt": "2025-12-16T10:30:00.000Z",
      "unreadCount": {
        "user1": 0,
        "user2": 3
      },
      "isActive": true,
      "createdAt": "2025-12-15T08:00:00.000Z",
      "updatedAt": "2025-12-16T10:30:00.000Z"
    }
  ]
}
```

### Get Conversation

Retrieve a specific conversation by ID.

**Endpoint:** `GET /conversations/:id`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Conversation ID |

**Response:**

```json
{
  "_id": "conv123",
  "participants": [...],
  "lastMessage": {...},
  "lastMessageAt": "2025-12-16T10:30:00.000Z",
  "unreadCount": {...},
  "isActive": true,
  "createdAt": "2025-12-15T08:00:00.000Z",
  "updatedAt": "2025-12-16T10:30:00.000Z"
}
```

**Errors:**

- `404 Not Found`: Conversation doesn't exist or user is not a participant
- `403 Forbidden`: User is not authorized to view this conversation

### Create Conversation

Create a new conversation with another user. If a conversation already exists between the two users, it will return the existing conversation.

**Endpoint:** `POST /conversations`

**Request Body:**

```json
{
  "recipientId": "user2"
}
```

**Response:**

```json
{
  "_id": "conv123",
  "participants": ["user1", "user2"],
  "unreadCount": {
    "user1": 0,
    "user2": 0
  },
  "isActive": true,
  "createdAt": "2025-12-16T10:00:00.000Z",
  "updatedAt": "2025-12-16T10:00:00.000Z"
}
```

**Errors:**

- `400 Bad Request`: Missing required field `recipientId`
- `404 Not Found`: Recipient user not found

### Update Conversation

Update conversation metadata (e.g., mark messages as read).

**Endpoint:** `PATCH /conversations/:id`

**Request Body:**

```json
{
  "markAsRead": true
}
```

**Response:**

```json
{
  "_id": "conv123",
  "participants": [...],
  "unreadCount": {
    "user1": 0,
    "user2": 0
  },
  ...
}
```

**Errors:**

- `404 Not Found`: Conversation not found
- `403 Forbidden`: User is not a participant

### Delete Conversation

Soft delete (archive) a conversation.

**Endpoint:** `DELETE /conversations/:id`

**Response:**

```json
{
  "_id": "conv123",
  "isActive": false,
  ...
}
```

---

## Messages API

Base path: `/messages`

### List Messages

Retrieve messages for a specific conversation, sorted by creation date (newest first).

**Endpoint:** `GET /messages`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `conversationId` | string | **Yes** | - | Conversation ID |
| `$limit` | number | No | 50 | Maximum number of results |
| `$skip` | number | No | 0 | Number of results to skip |
| `$sort[createdAt]` | number | No | -1 | Sort order (1=asc, -1=desc) |

**Response:**

```json
{
  "total": 100,
  "limit": 50,
  "skip": 0,
  "data": [
    {
      "_id": "msg123",
      "conversationId": "conv123",
      "senderId": {
        "_id": "user1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "avatar": "https://..."
      },
      "recipientId": {
        "_id": "user2",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "avatar": "https://..."
      },
      "content": "Hello, how are you?",
      "status": {
        "delivered": true,
        "deliveredAt": "2025-12-16T10:30:01.000Z",
        "read": true,
        "readAt": "2025-12-16T10:35:00.000Z"
      },
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2025-12-16T10:30:00.000Z",
      "updatedAt": "2025-12-16T10:35:00.000Z"
    }
  ]
}
```

**Errors:**

- `400 Bad Request`: Missing required parameter `conversationId`
- `404 Not Found`: Conversation not found or user is not a participant

### Get Message

Retrieve a specific message by ID.

**Endpoint:** `GET /messages/:id`

**Response:**

```json
{
  "_id": "msg123",
  "conversationId": "conv123",
  "senderId": {...},
  "recipientId": {...},
  "content": "Hello, how are you?",
  "status": {...},
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-12-16T10:30:00.000Z",
  "updatedAt": "2025-12-16T10:30:00.000Z"
}
```

### Create Message

Send a new message in a conversation. Automatically updates the conversation's `lastMessage` and increments the recipient's `unreadCount`.

**Endpoint:** `POST /messages`

**Request Body:**

```json
{
  "conversationId": "conv123",
  "recipientId": "user2",
  "content": "Hello, how are you?"
}
```

**Response:**

```json
{
  "_id": "msg123",
  "conversationId": "conv123",
  "senderId": "user1",
  "recipientId": "user2",
  "content": "Hello, how are you?",
  "status": {
    "delivered": false,
    "read": false
  },
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-12-16T10:30:00.000Z",
  "updatedAt": "2025-12-16T10:30:00.000Z"
}
```

**Errors:**

- `400 Bad Request`: Missing required fields
- `404 Not Found`: Conversation not found
- `403 Forbidden`: User is not a participant in the conversation

### Update Message

Update a message (edit content or mark as read/delivered).

**Endpoint:** `PATCH /messages/:id`

**Request Body (Mark as Read):**

```json
{
  "markAsRead": true
}
```

**Request Body (Mark as Delivered):**

```json
{
  "markAsDelivered": true
}
```

**Request Body (Edit Content):**

```json
{
  "content": "Updated message content"
}
```

**Response:**

```json
{
  "_id": "msg123",
  "conversationId": "conv123",
  "content": "Updated message content",
  "status": {
    "delivered": true,
    "deliveredAt": "2025-12-16T10:30:01.000Z",
    "read": true,
    "readAt": "2025-12-16T10:35:00.000Z"
  },
  "isEdited": true,
  "editedAt": "2025-12-16T10:40:00.000Z",
  "originalContent": "Hello, how are you?",
  ...
}
```

**Errors:**

- `404 Not Found`: Message not found
- `403 Forbidden`: Only sender can edit message content

### Delete Message

Soft delete a message (sender only).

**Endpoint:** `DELETE /messages/:id`

**Response:**

```json
{
  "_id": "msg123",
  "isDeleted": true,
  "deletedAt": "2025-12-16T11:00:00.000Z",
  "deletedBy": "user1",
  ...
}
```

**Errors:**

- `404 Not Found`: Message not found
- `403 Forbidden`: Only sender can delete their messages

---

## Messaging Contacts API

Base path: `/messaging-contacts`

### Get Contacts

Retrieve a list of users that the authenticated user can message, filtered based on their role and relationships in the LMS.

**Endpoint:** `GET /messaging-contacts`

**Authentication:** Required (JWT)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `role` | string | No | - | Admin-only: Override role for testing ('Student', 'Teacher', 'Admin') |

**Role-Based Filtering:**

- **Students** see:
  - Classmates (other students in their enrolled classes)
  - Teachers teaching their classes

- **Teachers** see:
  - Students enrolled in their teaching classes
  - Other teachers from the same school

- **Admins** see:
  - All users in the system

**Response:**

```json
[
  {
    "_id": "user123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "Student",
    "avatar": "https://...",
    "schoolId": "school456"
  },
  {
    "_id": "user456",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "role": "Teacher",
    "avatar": "https://...",
    "schoolId": "school456"
  }
]
```

**Example Requests:**

```bash
# Get contacts for current user
GET /messaging-contacts
Authorization: Bearer YOUR_JWT_TOKEN

# Admin: View contacts as a student would see them
GET /messaging-contacts?role=Student
Authorization: Bearer ADMIN_JWT_TOKEN

# Admin: View contacts as a teacher would see them
GET /messaging-contacts?role=Teacher
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response Codes:**

- `200 OK`: Successfully retrieved contacts
- `400 Bad Request`: Invalid query parameters
- `401 Not Authenticated`: Missing or invalid JWT token
- `403 Forbidden`: Non-admin user attempting role override

**Features:**

- ✅ Automatic filtering based on user role and relationships
- ✅ School-aware (multi-tenant support)
- ✅ Returns only basic contact information (no sensitive data)
- ✅ Efficient MongoDB aggregations
- ✅ Admin role override for testing/debugging

**Performance:**

- Uses optimized MongoDB aggregation pipelines
- Deduplicates contacts at database level
- Leverages existing indexes on classEnrollments and classTeachers collections
- Direct model access for minimal overhead

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "name": "BadRequest",
  "message": "Missing required fields",
  "code": 400,
  "className": "bad-request"
}
```

### 401 Not Authenticated

```json
{
  "name": "NotAuthenticated",
  "message": "User not authenticated",
  "code": 401,
  "className": "not-authenticated"
}
```

### 403 Forbidden

```json
{
  "name": "Forbidden",
  "message": "Not authorized to access this resource",
  "code": 403,
  "className": "forbidden"
}
```

### 404 Not Found

```json
{
  "name": "NotFound",
  "message": "Resource not found",
  "code": 404,
  "className": "not-found"
}
```

### 500 Internal Server Error

```json
{
  "name": "GeneralError",
  "message": "Internal server error",
  "code": 500,
  "className": "general-error"
}
```

---

## Rate Limiting

Currently, there are no rate limits on the REST API endpoints. However, it's recommended to implement rate limiting in production:

- **Conversations**: 60 requests/minute per user
- **Messages**: 120 requests/minute per user

---

## Pagination

All list endpoints support pagination with the following query parameters:

- `$limit`: Maximum number of results (default: 50, max: 100)
- `$skip`: Number of results to skip (default: 0)

Example:

```
GET /conversations?$limit=20&$skip=40
```

This retrieves conversations 41-60.

---

## Filtering

Messages can be filtered by conversation:

```
GET /messages?conversationId=conv123
```

---

## Sorting

Results can be sorted using the `$sort` parameter:

```
GET /conversations?$sort[lastMessageAt]=-1  # Descending (newest first)
GET /messages?$sort[createdAt]=1            # Ascending (oldest first)
```

---

## Population

Related documents are automatically populated:

- **Conversations**: Participants (user objects)
- **Messages**: Sender and recipient (user objects)

No additional query parameters needed.

