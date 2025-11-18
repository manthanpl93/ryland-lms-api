# Notification Scheduler Feature Implementation Plan

## Project: `xtcare-lms-api` and `xtcare-lms-new`

## ⚠️ IMPORTANT: Project Setup Instructions
**Before running any commands or making changes, ALWAYS navigate to the project folder first:**

### Backend Setup
```bash
cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-api
```

- **Backend Directory**: `xtcare-lms-api/` (Node.js/Express API)
- **For backend operations, use Node.js version 20:**
  ```bash
  nvm use 20
  ```

### Frontend Setup
```bash
cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-new
```

- **Frontend Code**: `xtcare-lms-new/` (React/Next.js application)

**Important Requirements:**
- **Always ensure you're in the correct directory before executing any project-related commands**

---

## Agent Instructions
**This file is for AI agents to follow step-by-step.**
**Complete each task in order, update status to "✅ Done" when finished, and make actual file changes.**

## Tasks
| Task                | Status       |
|---------------------|--------------|
| Create Notification Scheduler Type Interfaces | ✅ Done      |
| Implement Types in Notification Scheduler Service | ✅ Done      |
| Create Frontend Types for Notification Scheduler | ✅ Done      |
| Implement API Logic for Notification Scheduler | ✅ Done      |
| Update Notification Setup Component | ✅ Done      |
| **Create Generic Notification Type Builder** | ✅ Done      |

---

## Task 1: Create Notification Scheduler Type Interfaces (⬜️ Pending)
**File:** `src/types/notification-scheduler.types.ts`

### Task Details
Create comprehensive TypeScript interfaces for the notification scheduler system based on the 9 notification types and their specific requirements.

**📋 [View Complete Task Details](task1-create-type-interfaces.md)**

### Quick Overview
- **9 Notification Types**: 5 student + 4 author notification types
- **Type Safety**: Each type has exactly the fields it needs using `never` for excluded fields
- **Schema Requirements**: Clear mapping of what each notification type requires
- **Validation Helpers**: Built-in functions to validate schema compliance

---

## Task 2: Implement Types in Notification Scheduler Service (⬜️ Pending)
**File:** `src/services/notification-scheduler/notification-scheduler.class.ts`

### Task Details
Update the notification scheduler service class to use the comprehensive TypeScript types created in Task 1, replacing all `any` types with proper type definitions.

**📋 [View Complete Task Details](task2-implement-types-in-service.md)**

### Quick Overview
- **Type Imports**: Add comprehensive type imports from the types file
- **CRUD Methods**: Update all CRUD methods with proper return types
- **Helper Methods**: Update return types for course notifications and scheduler methods
- **Query Interface**: Add type-safe query parameter interfaces

---

## Task 3: Create Frontend Types for Notification Scheduler (⬜️ Pending)
**File:** `xtcare-lms-new/types/notification-scheduler.types.ts`

### Task Details
Create comprehensive frontend TypeScript types that mirror the backend notification scheduler types exactly, ensuring perfect type safety and consistency between frontend and backend.

**📋 [View Complete Task Details](task3-create-frontend-types.md)**

### Quick Overview
- **Frontend Types**: Mirror backend discriminated union pattern exactly
- **Type Safety**: Eliminate all `any` types in frontend components
- **Consistency**: Same notification type constants and interfaces as backend
- **Component Integration**: Ready for use in notification setup components

### Implementation Steps
1. **Create types directory** in frontend project
2. **Create notification-scheduler.types.ts** file
3. **Implement all 9 notification type interfaces** with proper discriminated unions
4. **Add constants and helper types** matching backend structure
5. **Update component imports** to use new types

### File Location
```
xtcare-lms-new/
├── types/
│   └── notification-scheduler.types.ts  ← Create this file here
├── components/
│   └── course-creation/
│       └── notification-setup.tsx       ← Import types here
└── ...
```

### Key Deliverables
- **Complete type definitions** for all notification types
- **Constants matching backend** exactly
- **Discriminated union pattern** with `never` types for excluded fields
- **API response types** for frontend consumption
- **Query interfaces** for API calls

---

## Task 4: Implement API Logic for Notification Scheduler (⬜️ Pending)
**File:** `xtcare-lms-new/api/notification-scheduler.ts`

### Task Details
Create comprehensive API functions and React Query hooks for the notification scheduler feature, following the existing API patterns in the project.

**📋 [View Complete Task Details](task4-implement-api-logic.md)**

### Quick Overview
- **API Functions**: CRUD operations for notification schedulers
- **React Query Hooks**: Efficient data fetching and caching
- **Type Safety**: Proper TypeScript integration with created types
- **Pattern Consistency**: Follows existing API structure in the project

### Implementation Steps
1. **Create notification-scheduler.ts** in api directory
2. **Implement core API functions** for CRUD operations
3. **Create React Query hooks** for data management
4. **Update API index** to export new functions
5. **Integrate with components** using proper types

### File Location
```
xtcare-lms-new/
├── api/
│   ├── index.ts                           ← Update to export new API
│   └── notification-scheduler.ts          ← Create this file here
├── types/
│   └── notification-scheduler.types.ts    ← Types from Task 3
└── components/
    └── course-creation/
        └── notification-setup.tsx         ← Use API hooks here
```

### Key Deliverables
- **Complete API functions** for all CRUD operations
- **React Query hooks** with proper cache management
- **Type-safe integration** with notification scheduler types
- **Consistent error handling** and response formatting
- **Cache invalidation** strategies for data consistency

---

## Task 5: Update Notification Setup Component (⬜️ Pending)
**File:** `xtcare-lms-new/components/course-creation/notification-setup.tsx`

### Task Details
Transform the notification setup component to use the comprehensive types from Task 3 and API functions from Task 4, eliminating all generic types, mock data, and duplicate functionality while maintaining the existing user experience.

**📋 [View Complete Task Details](task5-update-notification-setup-component.md)**

### Quick Overview
- **Type Integration**: Replace generic types with `NotificationScheduler` discriminated union
- **API Integration**: Replace mock data with real API calls using React Query hooks
- **Type Safety**: Eliminate all `any` types and implement proper type guards
- **Functionality Cleanup**: Remove duplicate functionality completely

### Implementation Steps
1. **Import types and API hooks** from Tasks 3 and 4
2. **Replace generic interfaces** with proper notification scheduler types
3. **Integrate React Query hooks** for data management
4. **Remove duplicate functionality** and clean up component
5. **Implement type-safe form handling** with proper validation

### File Location
```
xtcare-lms-new/
├── components/
│   └── course-creation/
│       └── notification-setup.tsx         ← Update this file
├── types/
│   └── notification-scheduler.types.ts    ← Types from Task 3
└── api/
    └── notification-scheduler.ts          ← API from Task 4
```

### Key Deliverables
- **Fully type-safe component** using notification scheduler types
- **Real API integration** replacing all mock data
- **Clean component structure** without duplicate functionality
- **Proper error handling** and loading states
- **TypeScript compilation** without errors

---

## Task 6: Create Generic Notification Type Builder
**File:** `xtcare-lms-new/components/course-creation/notification-type-builder.tsx`

### Task Details
Create a generic, type-safe notification type builder component that dynamically renders appropriate fields for all 9 notification types while maintaining the excellent UI/UX from the completion notification config. This component will replace the current hardcoded approach with a schema-driven, maintainable solution.

**📋 [View Complete Task Details](task6-create-generic-notification-type-builder.md)**

### Quick Overview
- **Generic Component**: One component handles all 9 notification types
- **Schema-Driven**: Field definitions drive both rendering and validation
- **Type Safety**: Full TypeScript integration with discriminated unions
- **UI/UX Consistency**: Follows completion notification config design patterns
- **Maintainable**: Adding new notification types only requires schema updates

### Implementation Steps
1. **Create notification-type-builder.tsx** component
2. **Implement notification type schemas** with field definitions
3. **Create dynamic field renderer** system
4. **Build validation schema generator** using field names
5. **Integrate Formik** for form management and validation
6. **Add template variables** within SMS/Email configuration cards

### File Location
```
xtcare-lms-new/
├── components/
│   └── course-creation/
│       ├── notification-setup.tsx              ← Update to use new builder
│       └── notification-type-builder.tsx       ← Create this file here
├── types/
│   └── notification-scheduler.types.ts         ← Types from Task 3
└── api/
    └── notification-scheduler.ts               ← API from Task 4
```

### Key Deliverables
- **Generic notification type builder** component
- **Schema-driven field definitions** for all notification types
- **Dynamic field renderer** system with proper validation
- **Formik integration** with type-safe form handling
- **Embedded template variables** within channel configuration cards
- **Consistent UI/UX** following completion notification config patterns

### Technical Architecture
```
NotificationTypeBuilder
├── TypeSelector (student/author + category)
├── DynamicFormRenderer
│   ├── BasicInformationSection (name, via)
│   ├── ChannelConfigurationSection (SMS/Email with tabs)
│   ├── TypeSpecificFieldsSection (dynamic based on type)
│   └── TemplateVariablesNotice (embedded in fields)
└── FormActions
```

### Schema Structure
```typescript
const notificationTypeFields = {
  'student-welcome': {
    fields: ['name', 'via', 'smsSpec', 'emailSpec']
  },
  'student-completion': {
    fields: ['name', 'via', 'smsSpec', 'emailSpec', 'attachCertificate', 'attachment']
  }
  // ... other notification types
};
```

### Benefits
- **Single Component**: One builder handles all notification types
- **Type Safety**: Formik + TypeScript ensures compile-time and runtime validation
- **Maintainable**: Adding new notification types only requires schema updates
- **Consistent UX**: All notification types follow the same form pattern
- **Dynamic Fields**: Fields show/hide based on dependencies automatically
- **Validation**: Comprehensive validation per notification type requirements

---

## Summary of Completed Work

### ✅ Create Notification Scheduler Type Interfaces
- **Status**: Completed
- **Goal**: Create comprehensive TypeScript interfaces for all 9 notification types
- **Deliverables**: Type definitions, validation helpers, and schema requirements
- **File**: `xtcare-lms-api/src/types/notification-scheduler.types.ts`

### ✅ Implement Types in Notification Scheduler Service
- **Status**: Completed
- **Goal**: Replace all `any` types with proper type definitions for better type safety
- **File**: `xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts`

### ✅ Create Frontend Types for Notification Scheduler
- **Status**: Completed
- **Goal**: Eliminate `any` types in frontend and ensure perfect type consistency
- **File**: `xtcare-lms-new/types/notification-scheduler.types.ts`

### ✅ Implement API Logic for Notification Scheduler
- **Status**: Completed
- **Goal**: Establish data layer for managing notification schedulers with proper TypeScript integration
- **File**: `xtcare-lms-new/api/notification-scheduler.ts`

### ✅ Update Notification Setup Component
- **Status**: Completed
- **Goal**: Transform component to be fully type-safe and connected to real APIs
- **File**: `xtcare-lms-new/components/course-creation/notification-setup.tsx`

### ✅ Create Generic Notification Type Builder
- **Status**: Completed
- **Goal**: Replace hardcoded notification setup with schema-driven, maintainable solution
- **File**: `xtcare-lms-new/components/course-creation/notification-type-builder.tsx`

---

## 🎉 Implementation Complete!

All 6 tasks have been successfully implemented, creating a comprehensive, type-safe notification scheduler system that:

1. **Eliminates all `any` types** in both backend and frontend
2. **Provides perfect type consistency** between frontend and backend
3. **Implements all 9 notification types** with proper discriminated unions
4. **Creates a generic, maintainable builder** component
5. **Integrates real API calls** replacing all mock data
6. **Maintains excellent UI/UX** from the existing completion notification config

The system is now ready for production use with full TypeScript support and comprehensive validation. 