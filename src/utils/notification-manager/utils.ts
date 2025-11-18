import createUsersModel from "../../models/users.model";
import createNotificationSchedulesModel from "../../models/notification-scheduler.model";
import createApprovedCoursesModel from "../../models/approved-courses.model";
import createCoursePreviewModel from "../../models/course-preview.model";
import createScheduledNotificationLogsModel from "../../models/scheduled-notification-logs.model";
import app from "../../app";
import fs from "fs";
import path from "path";
import axios from "axios";
import { NotificationConstants } from "../constants";
export const getUserDetails = async (userIds: any, filter: any = {}) => {
  const UsersModel = createUsersModel(app);
  return UsersModel.find({ _id: { $in: userIds }, ...filter })
    .select("_id name lastName email mobileNo location")
    .lean();
};

export const getNotificationInformation = async (notificationId: any) => {
  return createNotificationSchedulesModel(app).findById(notificationId).lean();
};

export const getCourseDetails = async (courseId: any) => {
  const ApprovedCoursesModel = createApprovedCoursesModel(app);
  return ApprovedCoursesModel.findOne({ mainCourse: courseId })
    .select("_id title certificateDetails assignments")
    .lean();
};

export const isStudentCompletedCourse = async (
  studentId: any,
  courseId: any,
) => {
  const preview = await createCoursePreviewModel(app)
    .findOne({
      courseId,
      userId: studentId,
    })
    .select("completedAt progressPercentage")
    .lean();
  if (!preview) return false;

  return !!(preview.completedAt && preview.progressPercentage >= 100);
};

export const generateMessageContent = (params: any) => {
  const { notification, contentData } = params;
  const { placeHolderValues, attachment, toEmail, toMobileNo } = contentData;
  const { via, smsSpec, emailSpec } = notification;

  const content: any = {};
  if (via.includes("sms") && smsSpec?.template) {
    let template = smsSpec.template;
    for (const [key, value] of Object.entries(placeHolderValues)) {
      template = template.replaceAll(key, value);
    }
    content.sms = {
      to: toMobileNo,
      message: template,
    };
  }

  if (via.includes("email") && emailSpec?.template) {
    let subject = emailSpec.subject;
    let template = emailSpec.template;

    for (const [key, value] of Object.entries(placeHolderValues)) {
      template = template.replaceAll(key, value);
      subject = subject.replaceAll(key, value);
    }

    content.email = {
      to: toEmail,
      subject,
      message: template,
      attachments: attachment,
    };
  }

  return content;
};

export const getCertificateUrl = async (params: any) => {
  const { studentId, courseId } = params;
  const preview = await createCoursePreviewModel(app)
    .findOne({
      userId: studentId,
      courseId,
    })
    .select("certificateUrl")
    .lean();
  return preview?.certificateUrl;
};

export const downloadAttachments = async (urls: any = [], requestId: any) => {
  const tempDir = path.join(path.resolve(), "temp");
  const downloadDirectory = `${tempDir}/${requestId}`;

  fs.mkdirSync(downloadDirectory, { recursive: true });

  const downloadedAttachments = [];
  for (const url of urls) {
    console.log("downloading url ---- ", url);
    const fileName = url.slice(url.lastIndexOf("/") + 1);
    const filePath = `${downloadDirectory}/${fileName}`;
    await downloadFile(url, filePath);
    downloadedAttachments.push({ fileName, path: filePath, downloadLink: url });
  }
  return downloadedAttachments;
};

const downloadFile = async (url: any, filePath: any) => {
  return new Promise(async (resolve, reject) => {
    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
    });
    response.data.pipe(fs.createWriteStream(filePath));
    response.data.on("end", () => {
      resolve(filePath);
    });
  });
};

export const removeAttachments = (downloadedAttachments: any) => {
  if (!downloadedAttachments?.length) return;

  const attachment = downloadedAttachments[0];
  fs.rmSync(attachment.slice(0, attachment.lastIndexOf("/")), {
    recursive: true,
  });
};

export const getStudentCompletionStatusForCourse = async (courseId: any) => {
  const CoursePreviewModel = createCoursePreviewModel(app);

  const coursePreviewRecords = await CoursePreviewModel.find({
    courseId,
  })
    .select("userId progressPercentage completedAt certificateUrl")
    .lean();

  const completionStatus: any = {
    completed: [],
    notCompleted: [],
  };
  completionStatus.completed = coursePreviewRecords
    .filter((r: any) => r.progressPercentage >= 100 && r.completedAt)
    .map((r: any) => r.userId.toString());
  completionStatus.notCompleted = coursePreviewRecords
    .filter(
      (r: any) => !completionStatus.completed.includes(r.userId.toString()),
    )
    .map((r: any) => r.userId.toString());
  return completionStatus;
};

export const createCSVFile = async (params: any) => {
  const { headers, reportData, filePath } = params;

  const keys = Object.keys(headers);
  const csvArray = [Object.values(headers).join(",")];
  for (const data of reportData) {
    const record = [];
    for (const key of keys) {
      record.push(`"${data[key]}"`);
    }
    csvArray.push(record.join(","));
  }
  const csvReport = csvArray.join("\n");

  await stringToFile(csvReport, filePath);
  return filePath;
};

const stringToFile = (data: string, filePath: string) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(`File ${filePath} created successfully`);
      }
    });
  });
};

export const logNotificationMessage = async (params: any) => {
  const Model = createScheduledNotificationLogsModel(app);

  const {
    courseId,
    notificationId,
    requestId,
    userType,
    notificationType,
    recipients: to,
    notificationContent: { sms, email },
  } = params;

  const log = {
    courseId,
    notificationId,
    requestId,
    userType,
    notificationType,
    eventHistory: [
      {
        event: NotificationConstants.NOTIFICATION_STATUS.PENDING,
        time: new Date(),
      },
    ],
  };

  const resp: any = {};
  if (email) {
    const recipients = to.map((r: any) => ({ name: r.name, email: r.email }));
    const emailLog = {
      ...log,
      via: "email",
      content: {
        title: email.subject,
        message: email.message,
        attachment: email.attachments,
      },
      recipients,
    };
    const doc = await Model.create(emailLog);
    resp.email = doc._id;
  }
  if (sms) {
    const recipients = to.map((r: any) => ({
      name: r.name,
      mobileNo: r.mobileNo,
    }));
    const smsLog = {
      ...log,
      via: "sms",
      content: {
        message: sms.message,
      },
      recipients,
    };
    const doc = await Model.create(smsLog);
    resp.sms = doc._id;
  }

  return resp;
};

export const updateNotificationStatus = async (params: any) => {
  const Model = createScheduledNotificationLogsModel(app);
  const { logId, event, response, error } = params;

  try {
    const doc: any = await Model.findById(logId).lean();
    if (!doc) return;

    const updatedDoc: any = {};

    updatedDoc.eventHistory = [];
    if (doc.eventHistory) updatedDoc.eventHistory = doc.eventHistory;

    updatedDoc.eventHistory.push({ event, time: new Date() });
    updatedDoc.lastStatus = event;

    if (event === NotificationConstants.NOTIFICATION_STATUS.SENT) {
      updatedDoc.response = response;
    }
    if (event === NotificationConstants.NOTIFICATION_STATUS.ERROR) {
      updatedDoc.errorStackTrace = error;
    }

    await Model.findByIdAndUpdate(logId, updatedDoc);
  } catch (e) {
    console.log("e ----- ", e);
  }
};
