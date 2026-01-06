# Architecture

## High-Level Changes

This phase adds a new **Messaging Contacts** service that provides role-based contact filtering for the chat application. The service:

- Creates a new Feathers service at `/messaging-contacts` endpoint
- Implements role-based aggregation pipelines for Students, Teachers, and Admins
- Returns basic contact information (name, email, avatar, role)
- Uses MongoDB aggregations for performant querying across Users, ClassEnrollments, and ClassTeachers collections
- Implements school-aware filtering for multi-tenant support

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GET /messaging-contacts                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │   Authentication Hook  │
                │  (Verify JWT, Get User)│
                └────────────┬───────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │   Determine User Role  │
                │ (Student/Teacher/Admin)│
                └────────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │   STUDENT    │ │   TEACHER    │ │    ADMIN     │
     │   Pipeline   │ │   Pipeline   │ │   Pipeline   │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            ▼                ▼                ▼
     Get Classes      Get Classes      Get All Users
     Get Classmates   Get Students     Get All Classes
     Get Teachers     Get Teachers     
            │                │                │
            └────────────────┼────────────────┘
                             ▼
                ┌────────────────────────┐
                │   Format & Return      │
                │   Contact List JSON    │
                └────────────────────────┘
```

## Source Code View

```
src/
├── services/
│   └── messaging-contacts/
│       ├── [+] messaging-contacts.service.ts ──→ Main service with find() method
│       ├── [+] messaging-contacts.class.ts ──→ Service class implementation
│       └── [+] messaging-contacts.hooks.ts ──→ Authentication & authorization
│
├── utils/
│   ├── [+] contact-aggregations.ts ──→ MongoDB aggregation pipelines
│   └── [+] role-filters.ts ──→ Role-based filtering logic
│
└── types/
    └── [+] messaging-contacts.types.ts ──→ Contact interfaces
```

**Legend:**
- [+] New file
- [~] Modified file
- [-] Deleted file

