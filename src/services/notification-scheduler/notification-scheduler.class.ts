import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import createApplication from "@feathersjs/feathers";
import createScheduledNotificationLogsModel from "../../models/scheduled-notification-logs.model";
import createApprovedCoursesModel from "../../models/approved-courses.model";
import {
  addNewNotificationSchedule,
  removeScheduleOfNotification,
  updateNotificationSchedule,
} from "../../utils/notification-manager";
import moment from "moment-timezone";
import configuration from "@feathersjs/configuration";
import app from "../../app";
import { NotFound } from "@feathersjs/errors";
import {
  NOTIFICATION_CONSTANT_TEXT,
} from "../../utils/constants";
import {
  NotificationSchedulerResponse,
  NotificationLogResponse,
  NotificationLogDetailResponse,
  CourseNotificationsQuery,
  NotificationLogsQuery,
  NotificationLogDetailsQuery,
  CreateNotificationSchedulerData,
  UpdateNotificationSchedulerData,
} from "../../types/notification-scheduler.types";

const { userTimeZone: USER_TZ = "America/New_York" } = configuration()();

export class NotificationScheduler extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
  }

  async create(
    data: CreateNotificationSchedulerData | CreateNotificationSchedulerData[],
    params?: createApplication.Params | undefined,
  ): Promise<any> {
    try {
      const result = await super.create(data, params);
      addNewNotificationSchedule(result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async get(
    id: createApplication.Id,
    params?: createApplication.Params | undefined,
  ): Promise<any> {
    try {
      return super.get(id, params);
    } catch (error) {
      throw error;
    }
  }

  async patch(
    id: createApplication.NullableId,
    data: UpdateNotificationSchedulerData,
    params?: createApplication.Params | undefined,
  ): Promise<any> {
    try {
      const result = await super.patch(id, data, params);
      updateNotificationSchedule(result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async remove(
    id: createApplication.NullableId,
    params?: createApplication.Params,
  ): Promise<{ message: string }> {
    const { controller, notificationIds }: { controller?: string; notificationIds?: string[] } = params?.query || {};

    const removeData = async (nId: string) => {
      removeScheduleOfNotification(nId);
      await super.remove(nId, params);
    };

    switch (controller) {
    case "bulk-notification-delete":
      if (notificationIds) {
        for (const nId of notificationIds) {
          await removeData(nId);
        }
      }
      break;

    default:
      if (id) {
        await removeData(id.toString());
      }
    }

    return { message: "deleted" };
  }

  async find(
    params?: createApplication.Params | undefined,
  ): Promise<any> {
    const { controller }: { controller?: string } = params?.query || {};
    console.log("query", params?.query);
    if (controller) {
      switch (controller) {
      case "course-notifications":
        return await this.fetchCourseNotifications(params?.query as CourseNotificationsQuery);
      case "notification-logs":
        return await this.fetchNotificationLogs(params as NotificationLogsQuery);
      case "notification-log-details":
        return await this.fetchNotificationDetails(params as NotificationLogDetailsQuery);
      default:
        return await super.find(params);
      }
    }

    return await super.find(params);
  }

  async fetchCourseNotifications(data: CourseNotificationsQuery): Promise<NotificationSchedulerResponse> {
    const { courseId, limit = 10, skip = 1, searchText = null } = data;
    console.log("data", data);
    console.log("courseId", courseId);

    let searchQuery: Record<string, any> = {};

    if (searchText) {
      const rgx = (pattern: string) => new RegExp(`.*${pattern}.*`);
      const searchRgx = rgx(searchText);

      searchQuery = { name: { $regex: searchRgx, $options: "i" } };
    }

    const notifications: any[] = await this.Model.find({
      courseId,
      ...searchQuery,
    })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "_id name lastName email")
      .sort({ createdAt: -1 })
      .lean();

    console.log("notifications", notifications);

    return {
      data: notifications,
      total: await this.Model.countDocuments({ courseId }),
      limit,
      skip,
    };
  }

  async fetchNotificationLogs(params: NotificationLogsQuery): Promise<NotificationLogResponse> {
    // if (
    //   !params?.user?.roles?.includes("admin") &&
    //   !params?.user?.roles?.includes("author")
    // )
    //   return;
    const { page = 0, limit = 5, filter = {} } = params;

    const baseFilter: Record<string, any> = {};
    if (filter?.via && filter?.via != "all") {
      baseFilter["via"] = filter?.via;
    }
    if (filter?.userType && filter?.userType != "all") {
      baseFilter["userType"] = filter?.userType;
    }
    if (filter?.notificationType?.length) {
      baseFilter["notificationType"] = {
        $in: filter?.notificationType,
      };
    }
    if (filter?.lastStatus?.length) {
      baseFilter["lastStatus"] = {
        $in: filter?.lastStatus,
      };
    }
    if (filter?.courseId?.length) {
      baseFilter["courseId"] = {
        $in: filter?.courseId,
      };
    }
    if (filter?.search) {
      const searchText = filter.search;
      const rgx = (pattern: string) => new RegExp(`${pattern}.*`);
      const searchRgx = rgx(searchText);

      if (filter.search.match(/^[0-9]+$/)) {
        baseFilter["via"] = "sms";
        baseFilter["recipients"] = {
          $elemMatch: {
            mobileNo: { $regex: searchRgx, $options: "i" },
          },
        };
      } else {
        baseFilter["via"] = "email";
        baseFilter["recipients"] = {
          $elemMatch: {
            email: { $regex: searchRgx, $options: "i" },
          },
        };
      }
    }

    const courses = await createApprovedCoursesModel(app)
      .find({})
      .select("mainCourse title certificateDetails")
      .lean();
    const courseTitleById: Record<string, string> = courses.reduce((acc: Record<string, string>, curr: any) => {
      const title = curr?.certificateDetails?.title ?? curr.title;
      acc[curr.mainCourse] = title;
      return acc;
    }, {});

    const docs = await createScheduledNotificationLogsModel(app)
      .find(baseFilter)
      .select(
        "_id courseId notificationId userType notificationType recipients lastStatus via createdAt",
      )
      .limit(limit)
      .skip(Number(page) * Number(limit))
      .sort({ _id: -1 })
      .lean();
    const total: number =
      await createScheduledNotificationLogsModel(app).count(baseFilter);

    return {
      notificationLogs: docs.map((d: any) => {
        return {
          ...d,
          userType: d.userType === "author" ? "Author" : "Student",
          notificationType:
            NOTIFICATION_CONSTANT_TEXT.STUDENT_NOTIFICATION_TYPES_TEXT[
              d.notificationType
            ] ??
            NOTIFICATION_CONSTANT_TEXT.AUTHOR_NOTIFICATION_TYPES_TEXT[
              d.notificationType
            ],
          via: d.via === "email" ? "Email" : "SMS",
          lastStatus:
            NOTIFICATION_CONSTANT_TEXT.NOTIFICATION_STATUS_TEXT[d.lastStatus],
          courseName: courseTitleById[d.courseId],
        };
      }),
      total,
      limit,
      skip: page * limit,
    };
  }

  async fetchNotificationDetails(params: NotificationLogDetailsQuery): Promise<NotificationLogDetailResponse> {
    const { logId } = params;
    const log = await createScheduledNotificationLogsModel(app)
      .findById(logId)
      .select(
        "_id courseId notificationId userType notificationType recipients lastStatus via createdAt eventHistory content",
      )
      .populate("notificationId", "_id name")
      .populate({
        path: "notificationId",
        select: "_id name locations",
        populate: {
          path: "locations",
          model: "categories",
          select: "_id name abbreviation",
        },
      })
      .lean();

    if (!log) throw new NotFound("Log not found!");

    const course: any = await createApprovedCoursesModel(app)
      .findOne({ mainCourse: log.courseId })
      .select("mainCourse title certificateDetails")
      .lean();

    return {
      ...log,
      userType: log.userType === "author" ? "Author" : "Student",
      notificationType:
        NOTIFICATION_CONSTANT_TEXT.STUDENT_NOTIFICATION_TYPES_TEXT[
          log.notificationType
        ] ??
        NOTIFICATION_CONSTANT_TEXT.AUTHOR_NOTIFICATION_TYPES_TEXT[
          log.notificationType
        ],
      lastStatus:
        NOTIFICATION_CONSTANT_TEXT.NOTIFICATION_STATUS_TEXT[log.lastStatus],
      notification: log.notificationId,
      courseName: course?.certificateDetails?.title ?? course.title,
    };
  }

  async fetchSchedulerNotifications(): Promise<any[]> {
    const scheduledNotifications: any[] = await this.Model.find({
      active: true,
      schedule: {
        $exists: true,
      },
    }).lean();

    const foo: any[] = [];
    for (const notification of scheduledNotifications) {
      let scheduleThisNotification = false;
      const { schedule } = notification;

      if (schedule?.dates?.length) {
        const dates = schedule?.dates;
        const time = schedule.time;
        for (const date of dates) {
          const dateMoment = moment.tz(
            date + " " + time,
            "YYYY-MM-DD HH:mm:ss",
            USER_TZ,
          );
          if (dateMoment > moment()) {
            scheduleThisNotification = true;
            break;
          }
        }
      } else if (schedule?.recurring) {
        const {
          startDate,
          endDate,
          neverEnd,
          time,
          interval,
          monthDates,
          weekDays,
        } = schedule.recurring;
        const isNeverEnd = neverEnd === "yes";
        const startDateMoment = moment.tz(startDate, "YYYY-MM-DD", USER_TZ);
        const endDateMoment = isNeverEnd
          ? null
          : moment.tz(endDate, "YYYY-MM-DD", USER_TZ).endOf("day");

        const now = moment();
        if (
          now < startDateMoment ||
          (endDateMoment !== null && now > endDateMoment)
        )
          continue;

        if (isNeverEnd) {
          scheduleThisNotification = true;
        } else {
          if (interval === "daily") {
            const scheduleTime = moment.tz(
              moment().tz(USER_TZ).format("YYYY-MM-DD") + " " + time,
              "YYYY-MM-DD HH:mm:ss",
              USER_TZ,
            );
            if (scheduleTime > now) scheduleThisNotification = true;
          } else if (interval === "weekly") {
            const isTimeOver = moment() > moment.tz(time, "HH:mm:ss", USER_TZ);
            const sortedDays = weekDays?.sort((a: number, b: number) => a - b) || [];
            const wantDayOfWeek = isTimeOver
              ? moment.tz(USER_TZ).add(1, "day").day()
              : moment.tz(USER_TZ).day();

            let nextAvailableDayIndex = sortedDays.findIndex(
              (d: number) => d >= wantDayOfWeek,
            );
            if (nextAvailableDayIndex === -1) nextAvailableDayIndex = 0;
            const nextAvailableDay = sortedDays[nextAvailableDayIndex];

            const nextSchedule = moment.tz(USER_TZ);
            while (nextSchedule.day() !== nextAvailableDay) {
              nextSchedule.add(1, "day");
            }
            const scheduleEndTime = moment.tz(
              endDate + " " + time,
              "YYYY-MM-DD HH:mm:ss",
              USER_TZ,
            );
            if (nextSchedule < scheduleEndTime) scheduleThisNotification = true;
          } else if (interval === "monthly") {
            const isTimeOver = moment() > moment.tz(time, "HH:mm:ss", USER_TZ);
            const sortedMonthDates = monthDates?.sort((a: number, b: number) => a - b) || [];

            const wantDateOfMonth = isTimeOver
              ? moment.tz(USER_TZ).add(1, "day").date()
              : moment.tz(USER_TZ).date();

            let nextAvailableDateIndex = sortedMonthDates.findIndex(
              (d: number) => d >= wantDateOfMonth,
            );
            if (nextAvailableDateIndex === -1) nextAvailableDateIndex = 0;
            const nextAvailableDate = sortedMonthDates[nextAvailableDateIndex];

            const nextSchedule = moment.tz(USER_TZ);
            while (nextSchedule.date() !== nextAvailableDate) {
              nextSchedule.add(1, "day");
            }
            const scheduleEndTime = moment.tz(
              endDate + " " + time,
              "YYYY-MM-DD HH:mm:ss",
              USER_TZ,
            );
            if (nextSchedule < scheduleEndTime) scheduleThisNotification = true;
          }
        }
      }

      if (scheduleThisNotification) foo.push(notification);
    }

    return foo;
  }
}
