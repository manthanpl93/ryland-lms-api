import { NotificationConstants } from "../constants";
import createNotificationSchedulesModel from "../../models/notification-scheduler.model";
import {
  getCourseEnrollmentAndCompletionReport,
  scheduledNotification,
  studentCompletedCourse,
  studentCompletedCourseToAuthor,
  studentEnrolled,
  studentEnrolledToAuthor,
} from "./action-controller";
import app from "../../app";

const triggerNotification = async (payload: any) => {
  const { type, data } = payload;
  switch (type) {
  case NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME:
    return await studentEnrolled(data);
  case NotificationConstants.STUDENT_NOTIFICATION_TYPES.COMPLETION:
    return await studentCompletedCourse(data);
  case NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_ENROLLED:
    return await studentEnrolledToAuthor(data);
  case NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_COMPLETED:
    return await studentCompletedCourseToAuthor(data);
  case NotificationConstants.STUDENT_NOTIFICATION_TYPES.ONE_TIME:
  case NotificationConstants.STUDENT_NOTIFICATION_TYPES.MULTIPLE_TIME:
  case NotificationConstants.STUDENT_NOTIFICATION_TYPES.RECURRING:
    return await scheduledNotification(data);
  case NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENTS_ENROLLED_LIST:
  case NotificationConstants.AUTHOR_NOTIFICATION_TYPES
    .STUDENTS_COMPLETED_LIST:
    return getCourseEnrollmentAndCompletionReport(data);
  }
};
export default triggerNotification;

export const triggerNotifications = async (params: any) => {
  const { courseId, notificationTypes } = params;

  const notifications = await createNotificationSchedulesModel(app).find({
    courseId,
    notificationType: { $in: notificationTypes },
  });

  if (!notifications?.length) return;

  for (const notification of notifications) {
    if (notification.active)
      await triggerNotification({
        type: notification.notificationType,
        data: { ...params, notificationId: notification._id },
      });
  }
};
