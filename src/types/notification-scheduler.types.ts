import { ObjectId } from "mongoose";

// Base notification scheduler interface
export interface BaseNotificationScheduler {
  _id?: ObjectId;
  courseId: ObjectId;
  name: string;
  active: boolean;
  userType: "author" | "student";
  createdBy: ObjectId;
  locations: ObjectId[];
  via: ("sms" | "email")[];
  recipients: Array<{
    _id: ObjectId;
    email: string;
  }>;
  otherRecipients?: string;
  schedule?: ScheduleConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schedule configuration
export interface ScheduleConfig {
  dates?: string[];
  time: string;
  recurring?: RecurringSchedule;
}

// Recurring schedule configuration
export interface RecurringSchedule {
  startDate: string;
  endDate?: string;
  neverEnd: "yes" | "no";
  time: string;
  interval: "daily" | "weekly" | "monthly";
  weekDays?: number[];
  monthDates?: number[];
}

// SMS specification
export interface SmsSpec {
  template: string;
}

// Email specification
export interface EmailSpec {
  subject: string;
  template: string;
  attachment?: any;
  attachCertificate?: boolean;
}

// Student notification types with discriminated union
export interface StudentWelcomeNotification extends BaseNotificationScheduler {
  notificationType: "welcome";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for welcome notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface StudentCompletionNotification extends BaseNotificationScheduler {
  notificationType: "completion";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  notificationForStudentWho: ("completedCourse" | "notCompletedCourse")[];
  // Exclude fields not needed for completion notifications
  attachCertificate?: never;
  attachment?: never;
}

export interface StudentOneTimeNotification extends BaseNotificationScheduler {
  notificationType: "oneTime";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for one-time notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface StudentMultipleTimeNotification extends BaseNotificationScheduler {
  notificationType: "multipleTime";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for multiple-time notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface StudentRecurringNotification extends BaseNotificationScheduler {
  notificationType: "recurring";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for recurring notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

// Author notification types with discriminated union
export interface AuthorStudentEnrolledNotification extends BaseNotificationScheduler {
  notificationType: "studentEnrolled";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for student enrolled notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface AuthorStudentCompletedNotification extends BaseNotificationScheduler {
  notificationType: "studentCompleted";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for student completed notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface AuthorStudentsEnrolledListNotification extends BaseNotificationScheduler {
  notificationType: "studentsEnrolledList";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for students enrolled list notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

export interface AuthorStudentsCompletedListNotification extends BaseNotificationScheduler {
  notificationType: "studentsCompletedList";
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  // Exclude fields not needed for students completed list notifications
  notificationForStudentWho?: never;
  attachCertificate?: never;
  attachment?: never;
}

// Union type for all notification schedulers
export type NotificationScheduler =
  | StudentWelcomeNotification
  | StudentCompletionNotification
  | StudentOneTimeNotification
  | StudentMultipleTimeNotification
  | StudentRecurringNotification
  | AuthorStudentEnrolledNotification
  | AuthorStudentCompletedNotification
  | AuthorStudentsEnrolledListNotification
  | AuthorStudentsCompletedListNotification;

// Notification type constants matching backend
export const NOTIFICATION_TYPES = {
  STUDENT: {
    WELCOME: "welcome" as const,
    COMPLETION: "completion" as const,
    ONE_TIME: "oneTime" as const,
    MULTIPLE_TIME: "multipleTime" as const,
    RECURRING: "recurring" as const,
  },
  AUTHOR: {
    STUDENT_ENROLLED: "studentEnrolled" as const,
    STUDENT_COMPLETED: "studentCompleted" as const,
    STUDENTS_ENROLLED_LIST: "studentsEnrolledList" as const,
    STUDENTS_COMPLETED_LIST: "studentsCompletedList" as const,
  },
} as const;

// User type constants
export const USER_TYPES = {
  STUDENT: "student" as const,
  AUTHOR: "author" as const,
} as const;

// Channel constants
export const CHANNELS = {
  SMS: "sms" as const,
  EMAIL: "email" as const,
} as const;

// Recurring interval constants
export const RECURRING_INTERVALS = {
  DAILY: "daily" as const,
  WEEKLY: "weekly" as const,
  MONTHLY: "monthly" as const,
} as const;

// Notification status constants
export const NOTIFICATION_STATUS = {
  PENDING: "pending" as const,
  SENT: "sent" as const,
  ERROR: "error" as const,
} as const;

// Student filter constants
export const STUDENT_FILTERS = {
  COMPLETED_COURSE: "completedCourse" as const,
  NOT_COMPLETED_COURSE: "notCompletedCourse" as const,
} as const;

// Template placeholder constants
export const TEMPLATE_PLACEHOLDERS = {
  STUDENT_NAME: "#StudentName" as const,
  COURSE_NAME: "#CourseName" as const,
} as const;

// Schedule type constants
export const SCHEDULE_TYPES = {
  CRON: "cron" as const,
  TIMEOUT: "timeout" as const,
} as const;

// Type guards for runtime validation
export const isStudentNotification = (
  notification: NotificationScheduler
): notification is StudentWelcomeNotification | StudentCompletionNotification | StudentOneTimeNotification | StudentMultipleTimeNotification | StudentRecurringNotification => {
  return notification.userType === "student";
};

export const isAuthorNotification = (
  notification: NotificationScheduler
): notification is AuthorStudentEnrolledNotification | AuthorStudentCompletedNotification | AuthorStudentsEnrolledListNotification | AuthorStudentsCompletedListNotification => {
  return notification.userType === "author";
};

export const isWelcomeNotification = (
  notification: NotificationScheduler
): notification is StudentWelcomeNotification => {
  return notification.notificationType === "welcome";
};

export const isCompletionNotification = (
  notification: NotificationScheduler
): notification is StudentCompletionNotification => {
  return notification.notificationType === "completion";
};

// Schema validation helpers
export interface NotificationSchemaRequirements {
  requiredFields: (keyof NotificationScheduler)[];
  optionalFields: (keyof NotificationScheduler)[];
  excludedFields: (keyof NotificationScheduler)[];
}

export const NOTIFICATION_SCHEMA_REQUIREMENTS: Record<string, NotificationSchemaRequirements> = {
  [NOTIFICATION_TYPES.STUDENT.WELCOME]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.STUDENT.COMPLETION]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec", "notificationForStudentWho"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.STUDENT.ONE_TIME]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.STUDENT.MULTIPLE_TIME]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.STUDENT.RECURRING]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.AUTHOR.STUDENT_ENROLLED]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.AUTHOR.STUDENT_COMPLETED]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.AUTHOR.STUDENTS_ENROLLED_LIST]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
  [NOTIFICATION_TYPES.AUTHOR.STUDENTS_COMPLETED_LIST]: {
    requiredFields: ["name", "via", "smsSpec", "emailSpec"],
    optionalFields: ["schedule", "recipients", "otherRecipients"],
    excludedFields: ["notificationForStudentWho", "attachCertificate", "attachment"],
  },
};

// Validation helper function
export const validateNotificationSchema = (
  notification: Partial<NotificationScheduler>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!notification.notificationType) {
    errors.push("Notification type is required");
    return { isValid: false, errors };
  }

  const requirements = NOTIFICATION_SCHEMA_REQUIREMENTS[notification.notificationType];
  if (!requirements) {
    errors.push(`Unknown notification type: ${notification.notificationType}`);
    return { isValid: false, errors };
  }

  // Check required fields
  for (const field of requirements.requiredFields) {
    if (!(field in notification)) {
      errors.push(`Required field missing: ${field}`);
    }
  }

  // Check excluded fields
  for (const field of requirements.excludedFields) {
    if (field in notification) {
      errors.push(`Field not allowed for this notification type: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// API response types
export interface NotificationSchedulerResponse {
  data: NotificationScheduler[];
  total: number;
  limit: number;
  skip: number;
}

export interface NotificationLogResponse {
  notificationLogs: Array<{
    _id: ObjectId;
    courseId: ObjectId;
    notificationId: ObjectId;
    userType: string;
    notificationType: string;
    recipients: any[];
    lastStatus: string;
    via: string;
    createdAt: Date;
    courseName: string;
  }>;
  total: number;
  limit: number;
  skip: number;
}

export interface NotificationLogDetailResponse {
  _id: ObjectId;
  courseId: ObjectId;
  notificationId: {
    _id: ObjectId;
    name: string;
    locations: Array<{
      _id: ObjectId;
      name: string;
      abbreviation: string;
    }>;
  };
  userType: string;
  notificationType: string;
  recipients: any[];
  lastStatus: string;
  via: string;
  createdAt: Date;
  eventHistory: any[];
  content: any;
  courseName: string;
}

// Query parameter interfaces
export interface CourseNotificationsQuery {
  courseId: ObjectId;
  limit?: number;
  skip?: number;
  searchText?: string;
}

export interface NotificationLogsQuery {
  page?: number;
  limit?: number;
  filter?: {
    via?: string;
    userType?: string;
    notificationType?: string[];
    lastStatus?: string[];
    courseId?: ObjectId[];
    search?: string;
  };
}

export interface NotificationLogDetailsQuery {
  logId: ObjectId;
}

// Create/Update data interfaces
export interface CreateNotificationSchedulerData {
  courseId: ObjectId;
  name: string;
  active?: boolean;
  userType: "author" | "student";
  notificationType: string;
  locations: ObjectId[];
  via: ("sms" | "email")[];
  smsSpec: SmsSpec;
  emailSpec: EmailSpec;
  recipients?: Array<{
    _id: ObjectId;
    email: string;
  }>;
  otherRecipients?: string;
  notificationForStudentWho?: ("completedCourse" | "notCompletedCourse")[];
  schedule?: ScheduleConfig;
}

export interface UpdateNotificationSchedulerData extends Partial<CreateNotificationSchedulerData> {
  _id: ObjectId;
} 