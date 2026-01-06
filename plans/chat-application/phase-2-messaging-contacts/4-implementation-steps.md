# Implementation Steps

## 1. Setup (Est: 1 hr)

- [ ] Create feature branch `feature/messaging-contacts-phase-2`
- [ ] Review Phase 1 implementation (conversations, messages, connection-manager)
- [ ] Create directory structure:
  - `src/services/messaging-contacts/`
  - `src/utils/` (add new files)
  - `src/types/` (add messaging-contacts.types.ts)
- [ ] Install any new dependencies (none required for this phase)

## 2. Type Definitions (Est: 1 hr)

- [ ] Create `src/types/messaging-contacts.types.ts`
- [ ] Define `Contact` interface with enriched data fields
- [ ] Define `StudentContact`, `TeacherContact`, `ClassContact` interfaces
- [ ] Define `MessagingContactsQuery` interface for query parameters
- [ ] Define `UnreadCountItem`, `LastMessageItem` interfaces
- [ ] Define `ContactsResponse` interface
- [ ] Export all types

## 3. Utility Functions - Aggregations (Est: 3 hrs)

- [ ] Create `src/utils/contact-aggregations.ts`
- [ ] Implement `getStudentContactsAggregation()`
  - [ ] Aggregate classmates from students collection
  - [ ] Aggregate teachers from classes collection
  - [ ] Union both results
  - [ ] Deduplicate contacts
- [ ] Implement `getTeacherContactsAggregation()`
  - [ ] Aggregate students from teacher's classes
  - [ ] Aggregate fellow teachers from same school
  - [ ] Union both results
  - [ ] Deduplicate contacts
- [ ] Implement `getAdminContactsAggregation()`
  - [ ] Aggregate all users except self
  - [ ] Sort by role and name
- [ ] Optimize aggregation pipelines for performance
- [ ] Add proper ObjectId conversions

## 4. Utility Functions - Role Filters (Est: 2 hrs)

- [ ] Create `src/utils/role-filters.ts`
- [ ] Implement `canContactUser()` main function
- [ ] Implement `canStudentContact()` helper
  - [ ] Check for common classes
  - [ ] Check for teacher-student relationship
- [ ] Implement `canTeacherContact()` helper
  - [ ] Check for student in teacher's class
  - [ ] Check for same-school teacher
- [ ] Implement `getSchoolFilter()` for multi-tenancy
- [ ] Implement `getRoleBasedQuery()` helper

## 5. Service Implementation (Est: 3 hrs)

### 5.1 Service Class
- [ ] Create `src/services/messaging-contacts/messaging-contacts.class.ts`
- [ ] Implement `MessagingContactsService` class
- [ ] Implement `find()` method with role detection
- [ ] Implement `getStudentContacts()` method
  - [ ] Get student's enrolled classes
  - [ ] Run student aggregation
  - [ ] Return contacts
- [ ] Implement `getTeacherContacts()` method
  - [ ] Get teacher's classes
  - [ ] Run teacher aggregation
  - [ ] Return contacts
- [ ] Implement `getAdminContacts()` method
  - [ ] Run admin aggregation
  - [ ] Return contacts
- [ ] Add comprehensive error handling

### 5.2 Service Hooks
- [ ] Create `src/services/messaging-contacts/messaging-contacts.hooks.ts`
- [ ] Add `authenticate('jwt')` hook
- [ ] Implement `authorizeContactAccess()` hook
  - [ ] Check role override permission
  - [ ] Validate admin access
- [ ] Implement `validateQuery()` hook
  - [ ] Validate allowed query parameters
  - [ ] Validate role parameter values
- [ ] Implement `schoolAwareFilter()` hook
  - [ ] Apply school filter for non-admins
- [ ] Export hooks object

### 5.3 Service Registration
- [ ] Create `src/services/messaging-contacts/messaging-contacts.service.ts`
- [ ] Register service with Feathers app
- [ ] Apply hooks to service
- [ ] Set up service options
- [ ] Update `src/services/index.ts` to include new service

## 6. Database Optimization (Est: 1 hr)

- [ ] Verify existing indexes are sufficient:
  - [ ] `classEnrollments.classId` (index) - already exists
  - [ ] `classEnrollments.studentId` (index) - already exists
  - [ ] `classTeachers.classId` (index) - already exists
  - [ ] `classTeachers.teacherId` (index) - already exists
  - [ ] `users.role` (index) - may need to add
  - [ ] `users.schoolId` (index) - already exists

## 7. Documentation (Est: 2 hrs)

- [ ] Document API endpoint in API reference docs
  - [ ] Endpoint: `GET /messaging-contacts`
  - [ ] Query parameters
  - [ ] Response format
  - [ ] Examples for each role
- [ ] Add code comments to complex aggregations
- [ ] Document type interfaces with JSDoc
- [ ] Create usage examples for developers
- [ ] Update README with Phase 2 information
- [ ] Document role-based access rules

## 8. Code Review & Cleanup (Est: 2 hrs)

- [ ] Review code for consistency with Phase 1
- [ ] Check error handling completeness
- [ ] Verify all TypeScript types are properly defined
- [ ] Check for code duplication
- [ ] Verify proper logging for debugging
- [ ] Check for security vulnerabilities
- [ ] Ensure school-aware filtering works correctly
- [ ] Run linter and fix any issues
- [ ] Format code consistently

## 9. Deployment Preparation (Est: 1 hr)

- [ ] Create migration script if needed (none required for this phase)
- [ ] Update environment variables documentation (none new for this phase)
- [ ] Verify backward compatibility with Phase 1
- [ ] Create deployment checklist
- [ ] Update CHANGELOG

## Total Estimated Time: ~15 hours

## Implementation Order

**Recommended order:**
1. Types first (foundation)
2. Utility functions (building blocks)
3. New service implementation (feature)
4. Optimization & documentation (polish)

## Key Dependencies

**Must be completed before starting:**
- Existing Users, ClassEnrollments, and ClassTeachers models must be in place

**Prerequisites:**
- MongoDB with proper indexes
- Existing Users, ClassEnrollments, ClassTeachers collections
- JWT authentication configured

## Success Criteria

- [ ] Students see only classmates and their teachers
- [ ] Teachers see class students and fellow teachers from school
- [ ] Admins see all users
- [ ] Contacts return basic user information (name, email, avatar, role)
- [ ] Performance acceptable with 1000+ users (< 500ms response time)
- [ ] No security vulnerabilities
- [ ] School-aware filtering working correctly
- [ ] Documentation complete and accurate

