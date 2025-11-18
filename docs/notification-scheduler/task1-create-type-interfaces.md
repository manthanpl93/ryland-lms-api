# Task 1: Create Notification Scheduler Type Interfaces

**File:** `src/types/notification-scheduler.types.ts`

## Task Details
Create comprehensive TypeScript interfaces for the notification scheduler system based on the 9 notification types and their specific requirements, including response types with database fields.

## Code Implementation

### 1. Create the Types File
```typescript:xtcare-lms-api/src/types/notification-scheduler.types.ts
import { ObjectId } from 'mongoose';

// Base notification types from constants
export type StudentNotificationType = 
  | 'welcome'
  | 'completion'
  | 'oneTime'
  | 'multipleTime'
  | 'recurring';

export type AuthorNotificationType = 
  | 'studentEnrolled'
  | 'studentCompleted'
  | 'studentsEnrolledList'
  | 'studentsCompletedList';

export type NotificationType = StudentNotificationType | AuthorNotificationType;

export type UserType = 'author' | 'student';
export type NotificationVia = 'sms' | 'email';
export type RecurringInterval = 'daily' | 'weekly' | 'monthly';
export type NeverEndOption = 'yes' | 'no';
export type AttachmentStatus = 'pending' | 'started' | 'uploading' | 'finished' | 'error';
export type StudentWhoOption = 'completedCourse' | 'notCompletedCourse';

// Attachment interface for email specifications
export interface EmailAttachment {
  status: AttachmentStatus;
  objectUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

// Email specification interface
export interface EmailSpec {
  subject: string;
  template: string;
  attachment?: EmailAttachment;
  attachCertificate?: boolean;
}

// SMS specification interface
export interface SmsSpec {
  template: string;
}

// Recipient interface
export interface Recipient {
  _id: ObjectId;
  email: string;
}

// Recurring schedule interface
export interface RecurringSchedule {
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string; // Format: "YYYY-MM-DD" or empty string for never ending
  neverEnd: NeverEndOption;
  time: string; // Format: "HH:mm:ss"
  interval: RecurringInterval;
  weekDays?: number[]; // [0,1,2,3,4,5,6] for weekly interval
  monthDates?: number[]; // [1,2,3...31] for monthly interval
}

// Schedule interface
export interface Schedule {
  dates?: string[]; // Format: ["YYYY-MM-DD"] for oneTime/multipleTime
  time?: string; // Format: "HH:mm:ss"
  recurring?: RecurringSchedule | null;
}

// Base notification scheduler interface
export interface BaseNotificationScheduler {
  courseId: ObjectId;
  name: string;
  active: boolean;
  userType: UserType;
  createdBy: ObjectId;
  notificationType: NotificationType;
  locations: ObjectId[];
  via: NotificationVia[];
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  recipients?: Recipient[];
  otherRecipients?: string;
  notificationForStudentWho?: StudentWhoOption[];
  schedule?: Schedule | null;
}

// ============================================================================
// STUDENT NOTIFICATION TYPES
// ============================================================================

// Welcome Notification - Triggered when student enrolls
export interface WelcomeNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'welcome';
  // No schedule needed - triggers automatically on enrollment
  schedule: never;
  // No notificationForStudentWho needed
  notificationForStudentWho: never;
  // No recipients needed - sent to all enrolled students
  recipients: never;
  // No otherRecipients needed
  otherRecipients: never;
}

// Completion Notification - Triggered when student completes course
export interface CompletionNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'completion';
  // No schedule needed - triggers automatically on completion
  schedule: never;
  // No notificationForStudentWho needed - sent to all completing students
  notificationForStudentWho: never;
  // No recipients needed - sent to all completing students automatically
  recipients: never;
  // No otherRecipients needed
  otherRecipients: never;
  // Can attach certificate
  emailSpec: EmailSpec & {
    attachCertificate?: boolean;
  };
}

// One Time Notification - Single scheduled notification
export interface OneTimeNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'oneTime';
  // Requires specific dates and time
  schedule: {
    dates: string[]; // Single date array
    time: string;
    recurring: never;
  };
  // Can specify which students to notify
  notificationForStudentWho?: StudentWhoOption[];
}

// Multiple Time Notification - Multiple scheduled notifications
export interface MultipleTimeNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'multipleTime';
  // Requires multiple dates and time
  schedule: {
    dates: string[]; // Multiple dates array
    time: string;
    recurring: never;
  };
  // Can specify which students to notify
  notificationForStudentWho?: StudentWhoOption[];
}

// Recurring Notification - Recurring scheduled notifications
export interface RecurringNotification extends BaseNotificationScheduler {
  userType: 'student';
  notificationType: 'recurring';
  // Requires recurring schedule configuration
  schedule: {
    dates: never;
    time: never;
    recurring: RecurringSchedule;
  };
  // Can specify which students to notify
  notificationForStudentWho?: StudentWhoOption[];
}

// ============================================================================
// AUTHOR NOTIFICATION TYPES
// ============================================================================

// Student Enrolled Notification - Triggered when student enrolls
export interface StudentEnrolledNotification extends BaseNotificationScheduler {
  userType: 'author';
  notificationType: 'studentEnrolled';
  // No schedule needed - triggers automatically on enrollment
  schedule: never;
  // No notificationForStudentWho needed
  notificationForStudentWho: never;
  // Requires recipients (authors to notify)
  recipients: Recipient[];
  otherRecipients?: string;
}

// Student Completed Notification - Triggered when student completes course
export interface StudentCompletedNotification extends BaseNotificationScheduler {
  userType: 'author';
  notificationType: 'studentCompleted';
  // No schedule needed - triggers automatically on completion
  schedule: never;
  // No notificationForStudentWho needed
  notificationForStudentWho: never;
  // Requires recipients (authors to notify)
  recipients: Recipient[];
  otherRecipients?: string;
}

// Students Enrolled List Notification - Recurring report
export interface StudentsEnrolledListNotification extends BaseNotificationScheduler {
  userType: 'author';
  notificationType: 'studentsEnrolledList';
  // Requires recurring schedule for reports
  schedule: {
    dates: never;
    time: never;
    recurring: RecurringSchedule;
  };
  // No notificationForStudentWho needed
  notificationForStudentWho: never;
  // Requires recipients (authors to notify)
  recipients: Recipient[];
  otherRecipients?: string;
}

// Students Completed List Notification - Recurring report
export interface StudentsCompletedListNotification extends BaseNotificationScheduler {
  userType: 'author';
  notificationType: 'studentsCompletedList';
  // Requires recurring schedule for reports
  schedule: {
    dates: never;
    time: never;
    recurring: RecurringSchedule;
  };
  // No notificationForStudentWho needed
  notificationForStudentWho: never;
  // Requires recipients (authors to notify)
  recipients: Recipient[];
  otherRecipients?: string;
}

// Union type for all notification types
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

// ============================================================================
// RESPONSE TYPES WITH DATABASE FIELDS
// ============================================================================

// Base response type that includes database fields
export interface NotificationSchedulerResponse extends NotificationScheduler {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Response type with populated createdBy field
export interface NotificationSchedulerWithPopulatedFields extends Omit<NotificationSchedulerResponse, 'createdBy'> {
  createdBy: {
    _id: ObjectId;
    name: string;
    lastName: string;
    email: string;
  };
}

// Response type for course notifications list
export interface CourseNotificationsResponse {
  data: NotificationSchedulerWithPopulatedFields[];
  total: number;
}

// Response type for paginated results
export interface PaginatedNotificationResponse {
  data: NotificationSchedulerResponse[];
  total: number;
  limit: number;
  skip: number;
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

export interface CourseNotificationsQuery {
  courseId: string;
  limit?: number;
  skip?: number;
  searchText?: string | null;
}

export interface NotificationSchedulerQuery {
  page?: number;
  limit?: number;
  search?: string;
  userType?: UserType;
  notificationType?: NotificationType;
  active?: boolean;
}

// Schema validation helpers
export interface NotificationSchemaRequirements {
  notificationType: NotificationType;
  userType: UserType;
  requiresSchedule: boolean;
  requiresRecipients: boolean;
  requiresStudentWho: boolean;
  scheduleType?: 'oneTime' | 'multipleTime' | 'recurring' | 'none';
  allowedVia: NotificationVia[];
  description: string;
}

// Schema requirements mapping for each notification type
export const NOTIFICATION_SCHEMA_REQUIREMENTS: Record<NotificationType, NotificationSchemaRequirements> = {
  // Student Notifications
  welcome: {
    notificationType: 'welcome',
    userType: 'student',
    requiresSchedule: false,
    requiresRecipients: false,
    requiresStudentWho: false,
    scheduleType: 'none',
    allowedVia: ['email', 'sms'],
    description: 'Automatically triggered when student enrolls in a course. No scheduling required.'
  },
  
  completion: {
    notificationType: 'completion',
    userType: 'student',
    requiresSchedule: false,
    requiresRecipients: false,
    requiresStudentWho: false,
    scheduleType: 'none',
    allowedVia: ['email', 'sms'],
    description: 'Automatically triggered when student completes a course. Can specify which students to notify and attach certificates.'
  },
  
  oneTime: {
    notificationType: 'oneTime',
    userType: 'student',
    requiresSchedule: true,
    requiresRecipients: false,
    requiresStudentWho: true,
    scheduleType: 'oneTime',
    allowedVia: ['email', 'sms'],
    description: 'Single scheduled notification on specific date and time. Useful for reminders and announcements.'
  },
  
  multipleTime: {
    notificationType: 'multipleTime',
    userType: 'student',
    requiresSchedule: true,
    requiresRecipients: false,
    requiresStudentWho: true,
    scheduleType: 'multipleTime',
    allowedVia: ['email', 'sms'],
    description: 'Multiple scheduled notifications on different dates. Useful for milestone reminders.'
  },
  
  recurring: {
    notificationType: 'recurring',
    userType: 'student',
    requiresSchedule: true,
    requiresRecipients: false,
    requiresStudentWho: true,
    scheduleType: 'recurring',
    allowedVia: ['email', 'sms'],
    description: 'Recurring notifications based on daily, weekly, or monthly intervals. Useful for ongoing reminders.'
  },
  
  // Author Notifications
  studentEnrolled: {
    notificationType: 'studentEnrolled',
    userType: 'author',
    requiresSchedule: false,
    requiresRecipients: true,
    requiresStudentWho: false,
    scheduleType: 'none',
    allowedVia: ['email', 'sms'],
    description: 'Automatically triggered when a student enrolls. Authors receive immediate notifications.'
  },
  
  studentCompleted: {
    notificationType: 'studentCompleted',
    userType: 'author',
    requiresSchedule: false,
    requiresRecipients: true,
    requiresStudentWho: false,
    scheduleType: 'none',
    allowedVia: ['email', 'sms'],
    description: 'Automatically triggered when a student completes a course. Authors receive immediate notifications.'
  },
  
  studentsEnrolledList: {
    notificationType: 'studentsEnrolledList',
    userType: 'author',
    requiresSchedule: true,
    requiresRecipients: true,
    requiresStudentWho: false,
    scheduleType: 'recurring',
    allowedVia: ['email'],
    description: 'Recurring reports of student enrollments. Authors receive scheduled enrollment summaries.'
  },
  
  studentsCompletedList: {
    notificationType: 'studentsCompletedList',
    userType: 'author',
    requiresSchedule: true,
    requiresRecipients: true,
    requiresStudentWho: false,
    scheduleType: 'recurring',
    allowedVia: ['email'],
    description: 'Recurring reports of student completions. Authors receive scheduled completion summaries.'
  }
};

// Helper function to get schema requirements for a notification type
export function getNotificationSchemaRequirements(notificationType: NotificationType): NotificationSchemaRequirements {
  return NOTIFICATION_SCHEMA_REQUIREMENTS[notificationType];
}

// Helper function to validate if a notification object meets its schema requirements
export function validateNotificationSchema(notification: Partial<NotificationScheduler>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const requirements = getNotificationSchemaRequirements(notification.notificationType!);
  
  // Validate schedule requirements
  if (requirements.requiresSchedule && !notification.schedule) {
    errors.push(`${requirements.notificationType} requires a schedule configuration`);
  }
  
  if (!requirements.requiresSchedule && notification.schedule) {
    errors.push(`${requirements.notificationType} does not require a schedule configuration`);
  }
  
  // Validate recipients requirements
  if (requirements.requiresRecipients && (!notification.recipients || notification.recipients.length === 0)) {
    errors.push(`${requirements.notificationType} requires recipients to be specified`);
  }
  
  // Validate student who requirements
  if (requirements.requiresStudentWho && (!notification.notificationForStudentWho || notification.notificationForStudentWho.length === 0)) {
    errors.push(`${requirements.notificationType} requires specifying which students to notify`);
  }
  
  // Validate via restrictions
  if (notification.via && notification.via.some(v => !requirements.allowedVia.includes(v))) {
    errors.push(`${requirements.notificationType} only supports: ${requirements.allowedVia.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Key Features of the Type System
- **9 Notification Types**: 5 student + 4 author notification types
- **Type Safety**: Each type has exactly the fields it needs using `never` for excluded fields
- **Schema Requirements**: Clear mapping of what each notification type requires
- **Validation Helpers**: Built-in functions to validate schema compliance
- **Response Types**: Complete coverage including database fields and populated relations
- **Real Examples**: Based on actual frontend implementation and business logic

## What This Provides
1. **Complete Type Coverage**: All notification types from the frontend are properly typed
2. **Schema Validation**: Clear understanding of what fields are required for each type
3. **Developer Experience**: IntelliSense and compile-time error checking
4. **Business Logic Clarity**: Each type's purpose and requirements are documented
5. **Database Response Types**: Full typing for API responses including technical fields
6. **Populated Field Support**: Proper typing for database relations and populated data

## Implementation Steps
1. Navigate to the backend directory: `cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-api`
2. Create the types file: `src/types/notification-scheduler.types.ts`
3. Copy the TypeScript code above into the file
4. Ensure the file is properly imported in your project

## File Location
- **Path**: `xtcare-lms-api/src/types/notification-scheduler.types.ts`
- **Type**: TypeScript interfaces and types
- **Purpose**: Define all notification scheduler data structures, validation rules, and response types 