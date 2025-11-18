import moment from "moment-timezone";
import app from "../../app";
import createNotificationSchedulesModel from "../../models/notification-scheduler.model";
import {
  triggerNotification,
  setNotificationScheduleById,
  getNotificationScheduleById,
  removeNotificationScheduleById,
} from "./index";
import cron from "node-cron";
import configuration from "@feathersjs/configuration";
import { NotificationConstants } from "../constants";
const { userTimeZone: USER_TZ = "America/New_York" } = configuration()();

export const onAppStartScheduler = async () => {
  // get all documents which contains schedule property
  // schedule.dates should contain at least one date that is greater or equal to current date
  // if its recurring type then if no start and end date | no start date and end date > current date | current date > start date and no end date
  const scheduledNotifications = await app
    .service("notification-scheduler")
    .fetchSchedulerNotifications();

  for (const notification of scheduledNotifications) {
    await scheduleNotification(notification);
  }
};

export const setUpcomingRecurringSchedules = async () => {
  // const NotificationSchedules = createNotificationSchedulesModel(app);
  // get all documents which contains schedule property
  // schedule.recurring.startDate is greater or equal to current date
  const currentDate = moment().tz(USER_TZ).startOf("day");
  const scheduledNotifications = await createNotificationSchedulesModel(
    app,
  ).find({
    active: true,
    $and: [
      {
        "schedule.recurring": { $exists: true },
      },
      {
        $or: [
          {
            "schedule.recurring.startDate": {
              $exists: false,
            },
          },
          {
            "schedule.recurring.startDate": null,
          },
          {
            "schedule.recurring.startDate": {
              $lte: currentDate.toDate(),
            },
          },
        ],
      },
      {
        $or: [
          {
            "schedule.recurring.endDate": {
              $exists: false,
            },
          },
          {
            "schedule.recurring.endDate": null,
          },
          {
            "schedule.recurring.endDate": {
              $gte: currentDate.toDate(),
            },
          },
        ],
      },
    ],
  });
  for (const notification of scheduledNotifications) {
    await scheduleNotification(notification);
  }
};

export const scheduleNotification = async (notification: any) => {
  const { _id, name } = notification;
  if (!name)
    notification = await createNotificationSchedulesModel(app).findById(_id);

  if (!notification) throw new Error("Notification not found");

  if (!notification.schedule) return;

  const schedule = notification.schedule;
  const isRecurring = schedule?.recurring !== null;

  const jobs: any = [];
  if (isRecurring) {
    const { startDate, endDate, interval, neverEnd } = schedule.recurring;
    const isNeverEnd = neverEnd === "yes";
    let cronString = "";
    if (process.env.NODE_ENV !== "production") {
      const notificationType = notification.notificationType;
      if (
        notificationType ===
          NotificationConstants.AUTHOR_NOTIFICATION_TYPES
            .STUDENTS_ENROLLED_LIST ||
        notificationType ===
          NotificationConstants.AUTHOR_NOTIFICATION_TYPES
            .STUDENTS_COMPLETED_LIST
      ) {
        // if (interval === "daily") cronString = "*/15 * * * *";
        // if (interval === "weekly") cronString = "*/30 * * * *";
        // if (interval === "monthly") cronString = "0 * * * *";
        cronString = getCronString(schedule.recurring);
      } else {
        cronString = getCronString(schedule.recurring);
      }
    } else {
      cronString = getCronString(schedule.recurring);
    }

    const startDateMoment = startDate
      ? moment.tz(startDate, "YYYY-MM-DD", USER_TZ).local()
      : null;
    const endDateMoment = endDate
      ? moment.tz(endDate, "YYYY-MM-DD", USER_TZ).endOf("day").local()
      : null;

    // TODO manage time zone in dates
    if (
      (!startDateMoment || moment() > startDateMoment) &&
      (!endDateMoment || isNeverEnd || moment() < endDateMoment)
    ) {
      const job: any = { type: NotificationConstants.SCHEDULE_TYPE.CRON };
      jobs.push(job);

      job.schedule = cron.schedule(
        cronString,
        async function () {
          await triggerNotification(notification, {
            notificationId: notification._id,
            courseId: notification.courseId,
          });
        },
        {
          scheduled: true,
          timezone: USER_TZ,
        },
      );
    }
  } else {
    const dates = schedule.dates;
    const time = schedule.time;
    for (const date of dates) {
      // TODO manage time zone for this date
      const dateMoment = moment.tz(
        `${date} ${time}`,
        "YYYY-MM-DD HH:mm:ss",
        USER_TZ,
      );
      if (moment() > dateMoment) continue;

      const job: any = { type: NotificationConstants.SCHEDULE_TYPE.TIMEOUT };
      jobs.push(job);
      const diff = dateMoment.valueOf() - Date.now();
      job.schedule = setTimeout(() => {
        triggerNotification(notification, {
          notificationId: notification._id,
          courseId: notification.courseId,
        });
      }, diff);
    }
  }
  if (jobs?.length) {
    const existingJobs = getNotificationScheduleById(notification._id);
    if (existingJobs?.length) jobs.push(...existingJobs);
    setNotificationScheduleById(notification._id, jobs);
  }
};

const getCronString = (schedule: any) => {
  const { interval, time, weekDays, monthDates } = schedule;

  let cronString = "";

  // Parse the time string
  // const scheduleTime = moment
  //   .tz(time, "HH:mm:ss", USER_TZ)
  //   .local()
  //   .format("HH:mm:ss");
  const [hours, minutes] = time.split(":"); // scheduleTime.split(":");

  // Generate cron expression based on the interval
  switch (interval) {
  case "daily":
    // Cron format: minute hour * * *
    cronString = `${minutes} ${hours} * * *`;
    break;
  case "weekly":
    // Cron format: minute hour * * dayOfWeek
    cronString = `${minutes} ${hours} * * ${weekDays.join(",")}`;
    break;
  case "monthly":
    // Cron format: minute hour dayOfMonth * *
    cronString = `${minutes} ${hours} ${monthDates.join(",")} * *`;
    break;
  default:
    console.error("Invalid interval value.");
    break;
  }

  return cronString;
};

export const deleteScheduleOfNotificationById = (notificationId: any) => {
  const jobs = getNotificationScheduleById(notificationId);

  if (!jobs?.length) return;

  for (const job of jobs) {
    const { type, schedule } = job;
    // TODO if job is cron job then
    if (type === NotificationConstants.SCHEDULE_TYPE.CRON) schedule.stop();
    // TODO if job is timeout then
    else if (type === NotificationConstants.SCHEDULE_TYPE.TIMEOUT)
      clearTimeout(schedule);
  }
  removeNotificationScheduleById(notificationId);
};
