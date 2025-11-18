// TODO on application startup, check and schedule notification

// TODO on API call, add/update/remove schedule

// TODO On course completion and enrollment, trigger notification

// TODO on schedule trigger, build notification message and queue for sending

// TODO send notification and log them

// TODO manage canceling of ongoing notifications and resuming halted notifications

// TODO monitoring of ongoing notification and their progress

// TODO handle modification in notification when its triggered and on going

// TODO for recurring schedule, need to start and stop schedules as per start and end date

import { NotificationConstants } from "../constants";
import {
  deleteScheduleOfNotificationById,
  scheduleNotification,
} from "./schedule-notifications";
import startSendingNotification from "./action-gateway";

const notificationIdWiseSchedules: any = {};
export const setNotificationScheduleById = (notificationId: any, job: any) => {
  notificationIdWiseSchedules[notificationId] = job;
};

export const getNotificationScheduleById = (notificationId: any) => {
  return notificationIdWiseSchedules[notificationId];
};
export const removeNotificationScheduleById = (notificationId: any) => {
  delete notificationIdWiseSchedules[notificationId];
};

export const addNewNotificationSchedule = async (notification: any) => {
  await scheduleNotification(notification);
};

export const updateNotificationSchedule = async (notification: any) => {
  deleteScheduleOfNotificationById(notification._id);
  if (notification.active) await scheduleNotification(notification);
};

export const removeScheduleOfNotification = (notificationId: any) => {
  deleteScheduleOfNotificationById(notificationId);
};

export const triggerNotification = async (notification: any, data: any) => {
  // do required things
  // check if schedule needs to be stopped
  await startSendingNotification({
    type: notification.notificationType,
    data,
  });

  if (
    notification?.schedule?.recurring?.endDate &&
    notification?.schedule?.recurring?.neverEnd !== "yes"
  ) {
    if (new Date() > notification?.schedule?.recurring?.endDate) {
      removeScheduleOfNotification(notification._id);
    }
  }
};
