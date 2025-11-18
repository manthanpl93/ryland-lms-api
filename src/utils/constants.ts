export const SocketConstants = {
  IDENTITY: "identity",
  KEEP_ALIVE: "keep-alive",
  FORCE_DISCONNECT: "force-disconnect",
  // Notifications
  COURSE_UPDATE: "course-update",
};

export const AWSConstants = {
  AWS_DOMAIN: "amazonaws.com",
};

export const AppConstants = {
  OTP_TIMEOUT: 10 * 60 * 1000, // 10 min
};

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

  SCHEDULE_TYPE: {
    CRON: "cron",
    TIMEOUT: "timeout",
  },
  TEMPLATE_PLACE_HOLDERS: {
    STUDENT_NAME: "#StudentName",
    COURSE_NAME: "#CourseName",
  },
  NOTIFICATION_FOR_STUDENTS_WHO: {
    COMPLETED_COURSE: "completedCourse",
    NOT_COMPLETED_COURSE: "notCompletedCourse",
  },
  RECURRING_INTERVAL: {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
  },
  NOTIFICATION_STATUS: {
    PENDING: "pending",
    SENT: "sent",
    ERROR: "error",
  },
};

export const NOTIFICATION_CONSTANT_TEXT: any = {
  STUDENT_NOTIFICATION_TYPES_TEXT: {
    [NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME]: "Welcome",
    [NotificationConstants.STUDENT_NOTIFICATION_TYPES.COMPLETION]: "Completion",
    [NotificationConstants.STUDENT_NOTIFICATION_TYPES.ONE_TIME]: "One Time",
    [NotificationConstants.STUDENT_NOTIFICATION_TYPES.MULTIPLE_TIME]:
      "Multiple Time",
    [NotificationConstants.STUDENT_NOTIFICATION_TYPES.RECURRING]: "Recurring",
  },
  AUTHOR_NOTIFICATION_TYPES_TEXT: {
    [NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_ENROLLED]:
      "Student Enrolled",
    [NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_COMPLETED]:
      "Student Completed",
    [NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENTS_ENROLLED_LIST]:
      "Students Enrolled List",
    [NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENTS_COMPLETED_LIST]:
      "Students Completed List",
  },
  NOTIFICATION_STATUS_TEXT: {
    [NotificationConstants.NOTIFICATION_STATUS.PENDING]: "Pending",
    [NotificationConstants.NOTIFICATION_STATUS.SENT]: "Sent",
    [NotificationConstants.NOTIFICATION_STATUS.ERROR]: "Error",
  },
};
