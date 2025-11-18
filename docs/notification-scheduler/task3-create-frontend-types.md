# Task 3: Create Frontend Types for Notification Scheduler

**File:** `xtcare-lms-new/types/notification-scheduler.types.ts`

## Task Details
Create comprehensive frontend TypeScript types that mirror the backend notification scheduler types exactly, ensuring perfect type safety and consistency between frontend and backend. This task eliminates all `any` types in frontend components and establishes a robust type system for the notification scheduler feature.

## 🎯 **Objectives**
- **Eliminate `any` types** in frontend notification components
- **Mirror backend types** exactly using discriminated union pattern
- **Ensure type consistency** between frontend and backend
- **Enable compile-time validation** for notification configurations
- **Provide better developer experience** with IntelliSense and type checking
- **Add runtime validation** for business logic enforcement

## 📁 **File Location**
```
xtcare-lms-new/
├── types/
│   └── notification-scheduler.types.ts  ← Create this file here
├── components/
│   └── course-creation/
│       └── notification-setup.tsx       ← Import types here
└── ...
```

## 🔧 **Implementation Steps**

### Step 1: Create Types Directory
```bash
cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-new
mkdir -p types
```

### Step 2: Create Types File
```bash
touch types/notification-scheduler.types.ts
```

### Step 3: Implement Complete Type System
Copy the comprehensive types code into the new file, including:
- All 9 notification type interfaces
- Constants matching backend exactly
- Discriminated union pattern with `never` types
- API response and query types
- **Runtime validation functions**

### Step 4: Update Component Imports
Modify `notification-setup.tsx` to import and use the new types

## 📋 **Required Type Definitions**

### 1. **Constants (Matching Backend)**
```typescript
export const NotificationConstants = {
  STUDENT_NOTIFICATION_TYPES: {
    WELCOME: "welcome",
    COMPLETION: "completion",
    ONE_TIME: "oneTime",
    MULTIPLE_TIME: "multipleTime",
    RECURRING: "recurring",
  },
  AUTHOR_NOTIFICATION_TYPES: {
    STUDENT_ENROLLED: "studentEnrolled",
    STUDENT_COMPLETED: "studentCompleted",
    STUDENTS_ENROLLED_LIST: "studentsEnrolledList",
    STUDENTS_COMPLETED_LIST: "studentsCompletedList",
  },
  // ... other constants
}
```

### 2. **Base Types**
```typescript
export type StudentNotificationType = 'welcome' | 'completion' | 'oneTime' | 'multipleTime' | 'recurring';
export type AuthorNotificationType = 'studentEnrolled' | 'studentCompleted' | 'studentsEnrolledList' | 'studentsCompletedList';
export type NotificationType = StudentNotificationType | AuthorNotificationType;
export type UserType = 'author' | 'student';
export type NotificationVia = 'sms' | 'email';
```

### 3. **Core Interfaces**
```typescript
export interface BaseNotificationScheduler {
  _id?: string;
  courseId: string;
  name: string;
  active: boolean;
  userType: UserType;
  createdBy: string;
  notificationType: NotificationType;
  locations: string[];
  via: NotificationVia[];
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // ... other base fields
}
```

### 4. **Discriminated Union Types**
```typescript
// Welcome Notification - No schedule, no recipients
export interface WelcomeNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'welcome';
  schedule: never;
  notificationForStudentWho: never;
  recipients: never;
  otherRecipients: never;
}

// One Time Notification - Requires schedule with dates
export interface OneTimeNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'oneTime';
  schedule: {
    dates: string[];
    time: string;
    recurring: never;
  };
  notificationForStudentWho?: StudentWhoOption[];
}

// ... all other notification types
```

### 5. **Union Type for All Notifications**
```typescript
export type NotificationScheduler = 
  | WelcomeNotification
  | CompletionNotification
  | OneTimeNotification
  | MultipleTimeNotification
  | RecurringNotification
  | StudentEnrolledNotification
  | StudentCompletedNotification
  | StudentsEnrolledListNotification
  | StudentsCompletedListNotification;
```

### 6. **API Response Types**
```typescript
export interface NotificationSchedulerResponse {
  success: boolean;
  data: NotificationScheduler;
  message?: string;
}

export interface NotificationSchedulerListResponse {
  success: boolean;
  data: NotificationScheduler[];
  total: number;
  limit: number;
  skip: number;
}
```

### 7. **Runtime Validation Functions**
```typescript
/**
 * Validates that notification specs match the selected via methods
 * Ensures business logic: if email is selected, emailSpec is required; if SMS is selected, smsSpec is required
 */
export const validateNotificationSpecs = (notification: BaseNotificationScheduler): string[] => {
  const errors: string[] = [];
  
  // Check if emailSpec exists when email is selected
  if (notification.via.includes('email') && !notification.emailSpec) {
    errors.push('Email configuration is required when email is selected');
  }
  
  // Check if smsSpec exists when SMS is selected
  if (notification.via.includes('sms') && !notification.smsSpec) {
    errors.push('SMS configuration is required when SMS is selected');
  }
  
  // Check if emailSpec is provided when email is not selected
  if (!notification.via.includes('email') && notification.emailSpec) {
    errors.push('Email configuration is not allowed when email is not selected');
  }
  
  // Check if smsSpec is provided when SMS is not selected
  if (!notification.via.includes('sms') && notification.smsSpec) {
    errors.push('SMS configuration is not allowed when SMS is not selected');
  }
  
  // Check OneTimeNotification: only one date allowed in schedule.dates
  if (notification.notificationType === 'oneTime' && notification.schedule) {
    if (notification.schedule.dates && notification.schedule.dates.length > 1) {
      errors.push('One-time notifications can only have one date');
    }
  }
  
  // Check otherRecipients: validate comma-separated email format
  if (notification.otherRecipients) {
    const emailList = notification.otherRecipients.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emailList) {
      if (email && !emailRegex.test(email)) {
        errors.push(`Invalid email format in otherRecipients: ${email}`);
        break; // Only show first invalid email error
      }
    }
  }
  
  return errors;
};

/**
 * Type guard to check if notification specs are valid
 * Returns true if no validation errors, false otherwise
 */
export const isValidNotificationSpecs = (notification: BaseNotificationScheduler): boolean => {
  return validateNotificationSpecs(notification).length === 0;
};

/**
 * Comprehensive validation for all notification requirements
 * Combines spec validation with other business rules
 */
export const validateNotification = (notification: BaseNotificationScheduler): string[] => {
  const errors: string[] = [];
  
  // Validate specs first
  errors.push(...validateNotificationSpecs(notification));
  
  // Add other validations as needed
  if (!notification.name.trim()) {
    errors.push('Notification name is required');
  }
  
  if (!notification.courseId) {
    errors.push('Course ID is required');
  }
  
  if (notification.locations.length === 0) {
    errors.push('At least one location must be selected');
  }
  
  if (notification.via.length === 0) {
    errors.push('At least one notification method must be selected');
  }
  
  return errors;
};
```

## ✅ **Success Criteria**
- [ ] Types file created in correct location
- [ ] All 9 notification types properly defined
- [ ] Discriminated union pattern implemented correctly
- [ ] Constants match backend exactly
- [ ] No `any` types in the entire file
- [ ] **Runtime validation functions included**
- [ ] Component can import and use types successfully
- [ ] TypeScript compilation passes without errors

## 🚨 **Common Issues & Solutions**

### Issue 1: Type Import Errors
**Problem**: Component can't find the types
**Solution**: Ensure correct import path and file location

### Issue 2: Type Mismatch with Backend
**Problem**: Frontend types don't match backend schema
**Solution**: Copy backend types exactly, only change ObjectId to string

### Issue 3: Discriminated Union Not Working
**Problem**: TypeScript not enforcing type constraints
**Solution**: Ensure `never` types are properly set for excluded fields

### Issue 4: Validation Not Working
**Problem**: Runtime validation not catching invalid configurations
**Solution**: Use `validateNotificationSpecs()` function before form submission

## 🔗 **Related Files**
- **Backend Types**: `xtcare-lms-api/src/types/notification-scheduler.types.ts`
- **Component**: `xtcare-lms-new/components/course-creation/notification-setup.tsx`
- **Main Doc**: `xtcare-lms-api/docs/notification-scheduler/notification-scheduler-feature.md`

## 📚 **References**
- **Backend Task**: [Task 1: Create Type Interfaces](../task1-create-type-interfaces.md)
- **Service Task**: [Task 2: Implement Types in Service](../task2-implement-types-in-service.md)
- **TypeScript Discriminated Unions**: [Official Documentation](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

## 💡 **Usage Examples**

### **Basic Validation**
```typescript
import { validateNotificationSpecs, isValidNotificationSpecs } from '../types/notification-scheduler.types';

const handleSubmit = () => {
  const errors = validateNotificationSpecs(notification);
  if (errors.length > 0) {
    setErrors(errors);
    return;
  }
  // Proceed with submission
};
```

### **Form Field Validation**
```typescript
const handleViaChange = (newVia: NotificationVia[]) => {
  setVia(newVia);
  
  // Validate immediately when via changes
  const tempNotification = { ...currentNotification, via: newVia };
  const errors = validateNotificationSpecs(tempNotification);
  setErrors(errors);
};
```

### **Type Guard Usage**
```typescript
if (isValidNotificationSpecs(notification)) {
  // TypeScript knows notification is valid here
  submitNotification(notification);
} else {
  // Show validation errors
  const errors = validateNotificationSpecs(notification);
  setErrors(errors);
}
```

