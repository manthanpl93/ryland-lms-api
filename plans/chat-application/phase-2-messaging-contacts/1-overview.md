# Phase 2: Messaging Contacts Service

## Summary

This phase introduces a dedicated **Messaging Contacts** service that provides role-based contact lists for the chat application. The service implements intelligent contact filtering based on user roles (Student, Teacher, Admin) and their relationships within the LMS system.

The service ensures that:
- **Students** only see other students and teachers from their enrolled classes
- **Teachers** see students from their teaching classes and all other teachers from the same school
- **Admins** have full access to all students, teachers, and classes in the system

Each contact entry includes basic user information (name, email, avatar, role). This simple list helps users identify who they can message. Detailed conversation data (online status, unread counts, last messages) will be loaded when users actually open a conversation.

This phase is kept separate from Phase 1 to maintain clean separation of concerns - Phase 1 handles the core messaging infrastructure while Phase 2 focuses on contact discovery and relationship-based filtering.

## Context

The chat application from Phase 1 provides the core messaging infrastructure (WebSocket communication, message persistence, conversations). However, users need a way to discover who they can chat with based on their role and relationships in the LMS.

The system needs to respect the hierarchical structure:
- Students are enrolled in specific classes
- Teachers teach specific classes and belong to schools
- Admins have system-wide access
- All relationships are school-aware for multi-tenant support

This service will be called when users open the chat interface to populate their contact list. It must be performant (using MongoDB aggregations) and return basic contact information to show who they can message.

## Deliverables

1. **Messaging Contacts Service** (`/messaging-contacts`)
   - Feathers service with role-based contact filtering
   - Query parameter support for role override (admin feature)
   - Integration with existing Users, ClassEnrollments, and ClassTeachers collections

2. **Contact Aggregation Logic**
   - Student contact aggregation (classmates + teachers)
   - Teacher contact aggregation (class students + fellow teachers)
   - Admin contact aggregation (all users + classes)

3. **Type Definitions**
   - Contact interface with basic user data
   - Role-based query parameters
   - Response types for different contact types

4. **Service Hooks**
   - Authentication validation
   - Role-based access control
   - School-aware filtering (automatic for students/teachers)
   - Query parameter validation

## Tasks

- [ ] Create `messaging-contacts.service.ts` with Feathers service setup
- [ ] Implement `getStudentContacts()` aggregation method
- [ ] Implement `getTeacherContacts()` aggregation method
- [ ] Implement `getAdminContacts()` aggregation method
- [ ] Create TypeScript interfaces in `messaging-contacts.types.ts`
  - [ ] `Contact` interface
  - [ ] `StudentContact` interface
  - [ ] `TeacherContact` interface
  - [ ] `ClassContact` interface (admin only)
  - [ ] `MessagingContactsQuery` interface
- [ ] Implement service hooks for authentication and authorization
- [ ] Add school-aware filtering for multi-tenant support
- [ ] Add query parameter support for role override (admin feature)
- [ ] Optimize MongoDB aggregations with proper indexes
- [ ] Add error handling with appropriate Feathers errors
- [ ] Document API endpoints and query parameters

