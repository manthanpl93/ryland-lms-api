import { Queue, QueueOptions, Worker } from "bullmq";
import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
const appConfig = feathers().configure(configuration());
const RedisAuth = appConfig.get("redis");
import Redis from "ioredis";
import { sendSMS } from "../utils/utilities";
import app from "../app";
import { loginWithOTPSMSAction } from "../services/forget-password/forget-password.class";
import { processVideosOfCourse } from "./videoProcessor";
import { generateReportCertificate } from "./reportCertificateGenerator";
import { sendEmail } from "../utils/email";
import {
  logNotificationMessage,
  updateNotificationStatus,
} from "../utils/notification-manager/utils";
import { NotificationConstants } from "../utils/constants";

const connection = new Redis({
  port: RedisAuth?.port ?? 6379,
  host: RedisAuth?.host ?? "127.0.0.1",
  maxRetriesPerRequest: null,
});

const CreateQueue = (options: any) => {
  try {
    return new Queue(options.name, {
      connection,
    });
  } catch (err) {
    console.log(err);
  }
};

const smsQueue = CreateQueue({ name: "smsQueue" });

const videoProcessingQueue = CreateQueue({ name: "videoProcessing" });

const notificationSMSQueue = CreateQueue({ name: "notificationSMSQueue" });
const notificationEmailQueue = CreateQueue({ name: "notificationEmailQueue" });

const smsWorker = new Worker(
  "smsQueue",
  async (job) => {
    const { data } = job;
    const { controller } = data;

    if (controller === "notification") {
      const { to, message } = data.notificationContent.sms;
      let event, response, error;
      try {
        response = await sendSMS(to, message);
        event = NotificationConstants.NOTIFICATION_STATUS.SENT;
      } catch (err) {
        console.log("error while sending sms--", err);
        error = err;
        event = NotificationConstants.NOTIFICATION_STATUS.ERROR;
      }
      // TODO log this message
      await updateNotificationStatus({ ...data, event, response, error });
    } else {
      const { mobileNo, message, extraData = {} } = data;
      const { action } = extraData;
      try {
        await sendSMS(mobileNo, message);
        let actionFn;
        if (action === "loginWithOTP")
          actionFn = loginWithOTPSMSAction["onSuccess"];
        if (actionFn) actionFn(extraData, app);
      } catch (err) {
        console.log("error while sending sms from queue", err);
        try {
          let actionFn;
          if (action === "loginWithOTP")
            actionFn = loginWithOTPSMSAction["onFailure"];
          if (actionFn) actionFn(extraData, err, app);
        } catch (failureErr) {
          console.log("error while calling sms send onFailure", failureErr);
        }
      }
    }
  },
  {
    connection,
    limiter: {
      max: 3,
      duration: 1000,
    },
  },
);

export const addSMSToQueue = async ({ mobileNo, message, extraData }: any) => {
  console.log("smsQueue ---------", smsQueue);
  if (smsQueue) {
    await smsQueue.add(
      `${mobileNo}:${new Date().getTime()}`,
      { mobileNo, message, extraData },
      { removeOnComplete: true, removeOnFail: true, priority: 10 },
    );
  }
};

const videoProcessorWorker = new Worker(
  "videoProcessing",
  async (job) => {
    const { data } = job;
    const { type, courseId } = data;
    console.log(type, "starting processing queue ==== ", courseId);
    if (type === "report") await generateReportCertificate(data);
    else await processVideosOfCourse(courseId);
  },
  {
    connection,
    // limiter: {
    // max: 1,
    // duration: 1000,
    // },
  },
);

export const addCourseIdForVideoProcessing = async (courseId: string) => {
  console.log("adding to queue ===== ", courseId);
  if (videoProcessingQueue)
    await videoProcessingQueue.add(
      `${courseId}:${new Date().getTime()}`,
      { courseId },
      { removeOnComplete: true, removeOnFail: true },
    );
};

export const addReportCertGenerationToQueue = async (data: any) => {
  console.log("adding cert report generation to queue -------");
  const { courseId, requestId } = data;
  if (videoProcessingQueue)
    await videoProcessingQueue.add(
      `report:${requestId}:${new Date().getTime()}`,
      data,
      { removeOnComplete: true, removeOnFail: true },
    );
};

const notificationEmailWorker = new Worker(
  "notificationEmailQueue",
  async (job) => {
    const { data } = job;

    let event = "";
    let response;
    let error;
    try {
      const {
        notificationContent: { email },
      } = data;
      response = await sendEmail(email);
      event = NotificationConstants.NOTIFICATION_STATUS.SENT;
      // TODO log this entry
    } catch (err) {
      console.log("Error occurred while sending notification email", err);
      event = NotificationConstants.NOTIFICATION_STATUS.ERROR;
      error = err;
    }

    await updateNotificationStatus({ ...data, event, response, error });
  },
  {
    connection,
    limiter: {
      max: 3,
      duration: 1000,
    },
  },
);

export const queueNotificationMessage = async (params: any) => {
  const {
    notificationId,
    userId,
    requestId,
    notificationContent: { sms, email },
  } = params;

  const logIds = await logNotificationMessage(params);

  if (email) {
    if (notificationEmailQueue) {
      await notificationEmailQueue.add(
        `${notificationId}:${requestId}:${userId}`,
        { ...params, logId: logIds.email },
        {
          removeOnComplete: true,
          removeOnFail: true,
          priority: 100,
        },
      );
    }
  }
  if (sms) {
    const { to } = sms;
    if (smsQueue)
      await smsQueue.add(
        `${notificationId}:${requestId}:${to}`,
        { ...params, controller: "notification", logId: logIds.sms },
        {
          removeOnComplete: true,
          removeOnFail: true,
          priority: 100,
        },
      );
  }
};

export { connection };
