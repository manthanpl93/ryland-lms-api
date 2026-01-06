import {
  createCSVFile,
  downloadAttachments,
  generateMessageContent,
  getCertificateUrl,
  getCourseDetails,
  getNotificationInformation,
  getStudentCompletionStatusForCourse,
  getUserDetails,
  isStudentCompletedCourse,
  removeAttachments,
} from "./utils";
import { NotificationConstants } from "../constants";
import { queueNotificationMessage } from "../../processors";
import moment from "moment-timezone";
import configuration from "@feathersjs/configuration";
const { userTimeZone: USER_TZ = "America/New_York" } = configuration()();
import studentProgressModel from "../../models/student-progress.model";
import app from "../../app";
import path from "path";
import fs from "fs";
import { generateRandomString, uploadFileToS3 } from "../utilities";

export const studentEnrolled = async (payload: any) => {
  const { studentId, notificationId, courseId } = payload;

  const students = await getUserDetails([studentId]);
  const notification = await getNotificationInformation(notificationId);

  const { name, lastName, email, mobileNo, location } = students[0];

  if (
    !notification.locations
      .map((l: any) => l.toString())
      .includes(location.toString())
  )
    return;

  const course: any = await getCourseDetails(courseId);

  const fullName = getFullName(name, lastName);
  const placeHolderValues: any = {
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.STUDENT_NAME]: fullName,
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]:
      course.certificateDetails?.title ?? course.title,
  };

  // TODO for attachment, download files locally and pass absolute path
  const requestId = generateRandomString(8);
  const attachment: any = await downloadAttachments(
    notification.emailSpec?.attachment?.objectUrl
      ? [notification.emailSpec?.attachment?.objectUrl]
      : [],
    requestId
  );

  const recipients = [{ name: fullName, email, mobileNo }];
  const content = generateMessageContent({
    notification,
    contentData: {
      placeHolderValues,
      attachment,
      toEmail: recipients.map((r) => r.email),
      toMobileNo: recipients[0].mobileNo,
    },
  });
  // sendEmail(content, recipients);
  await queueNotificationMessage({
    courseId,
    userType: notification.userType,
    notificationType: notification.notificationType,
    requestId,
    notificationId,
    userId: studentId,
    recipients,
    notificationContent: content,
  });
};

export const studentCompletedCourse = async (payload: any) => {
  const { studentId, notificationId, courseId } = payload;

  const students = await getUserDetails([studentId]);
  const notification = await getNotificationInformation(notificationId);

  const { name, lastName, email, mobileNo, location } = students[0];

  if (
    !notification.locations
      .map((l: any) => l.toString())
      .includes(location.toString())
  )
    return;

  const course: any = await getCourseDetails(courseId);
  if (course.assignments?.length > 0) {
    const assessmentCleared = await isStudentCompletedCourse(
      studentId,
      courseId
    );
    if (!assessmentCleared) return;
  }

  const fullName = getFullName(name, lastName);
  const placeHolderValues: any = {
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.STUDENT_NAME]: fullName,
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]:
      course.certificateDetails?.title ?? course.title,
  };

  // TODO for attachment and cert., download files locally and pass absolute path
  let certificateUrl;
  if (notification.emailSpec?.attachCertificate)
    certificateUrl = await getCertificateUrl({ studentId, courseId });
  const urls = [];
  if (certificateUrl || notification.emailSpec?.attachment?.objectUrl) {
    if (certificateUrl) urls.push(certificateUrl);
    if (notification.emailSpec?.attachment?.objectUrl)
      urls.push(notification.emailSpec?.attachment?.objectUrl);
  }

  const requestId = generateRandomString(8);
  const attachment: any = await downloadAttachments(urls, requestId);

  const recipients = [{ name: fullName, email, mobileNo }];
  const content = generateMessageContent({
    notification,
    contentData: {
      placeHolderValues,
      attachment,
      toEmail: recipients.map((r) => r.email),
      toMobileNo: recipients[0].mobileNo,
    },
  });

  await queueNotificationMessage({
    courseId,
    userType: notification.userType,
    notificationType: notification.notificationType,
    requestId,
    notificationId,
    userId: studentId,
    recipients,
    notificationContent: content,
  });

  // removeAttachments(attachment);
};

export const studentEnrolledToAuthor = async (payload: any) => {
  const { studentId, notificationId, courseId } = payload;

  const students = await getUserDetails([studentId]);
  const notification = await getNotificationInformation(notificationId);

  const { name, lastName, location } = students[0];

  if (
    !notification.locations
      .map((l: any) => l.toString())
      .includes(location.toString())
  )
    return;

  const course: any = await getCourseDetails(courseId);

  const placeHolderValues: any = {
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.STUDENT_NAME]: getFullName(
      name,
      lastName
    ),
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]:
      course.certificateDetails?.title ?? course.title,
  };

  // TODO for attachment, download files locally and pass absolute path
  const requestId = generateRandomString(8);
  const attachment: any = await downloadAttachments(
    notification.emailSpec?.attachment?.objectUrl
      ? [notification.emailSpec?.attachment?.objectUrl]
      : [],
    requestId
  );
  const recipients = await getUserDetails(
    notification.recipients.map((r: any) => r._id)
  );
  const otherRecipients = notification.otherRecipients
    ? notification.otherRecipients.split(",")
    : [];

  const recipientsForLog = recipients.map((u: any) => {
    return {
      name: getFullName(u.name, u.lastName),
      email: u.email,
      mobileNo: u.mobileNo,
    };
  });
  recipientsForLog.push(...otherRecipients.map((email: any) => ({ email })));

  const toEmail = [...recipients.map((el) => el.email), ...otherRecipients];
  const content = generateMessageContent({
    notification,
    contentData: {
      placeHolderValues,
      attachment,
      toEmail,
    },
  });
  // sendEmail(content, recipients);
  await queueNotificationMessage({
    courseId,
    userType: notification.userType,
    notificationType: notification.notificationType,
    requestId,
    notificationId,
    userId: studentId,
    recipients: recipientsForLog,
    notificationContent: content,
  });
};

export const studentCompletedCourseToAuthor = async (payload: any) => {
  const { studentId, notificationId, courseId } = payload;

  const students = await getUserDetails([studentId]);
  const notification = await getNotificationInformation(notificationId);

  const { name, lastName, location } = students[0];

  if (
    !notification.locations
      .map((l: any) => l.toString())
      .includes(location.toString())
  )
    return;

  const course: any = await getCourseDetails(courseId);
  if (course.assignments?.length > 0) {
    const assessmentCleared = await isStudentCompletedCourse(
      studentId,
      courseId
    );
    if (!assessmentCleared) return;
  }

  const placeHolderValues: any = {
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.STUDENT_NAME]: getFullName(
      name,
      lastName
    ),
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]:
      course.certificateDetails?.title ?? course.title,
  };

  // TODO for attachment and cert., download files locally and pass absolute path
  let certificateUrl;
  if (notification.emailSpec?.attachCertificate)
    certificateUrl = await getCertificateUrl({ studentId, courseId });

  const urls = [];
  if (certificateUrl || notification.emailSpec?.attachment) {
    if (certificateUrl) urls.push(certificateUrl);
    if (notification.emailSpec?.attachment?.objectUrl)
      urls.push(notification.emailSpec?.attachment?.objectUrl);
  }

  const requestId = generateRandomString(8);
  const attachment: any = await downloadAttachments(urls, requestId);
  const recipients = await getUserDetails(
    notification.recipients.map((r: any) => r._id)
  );
  const otherRecipients = notification.otherRecipients
    ? notification.otherRecipients.split(",")
    : [];

  const recipientsForLog = recipients.map((u: any) => {
    return {
      name: getFullName(u.name, u.lastName),
      email: u.email,
      mobileNo: u.mobileNo,
    };
  });
  recipientsForLog.push(...otherRecipients.map((email: any) => ({ email })));

  const toEmail = [...recipients.map((el) => el.email), ...otherRecipients];
  const content = generateMessageContent({
    notification,
    contentData: {
      placeHolderValues,
      attachment,
      toEmail,
    },
  });

  await queueNotificationMessage({
    courseId,
    userType: notification.userType,
    notificationType: notification.notificationType,
    requestId,
    notificationId,
    userId: studentId,
    recipients: recipientsForLog,
    notificationContent: content,
  });

  // removeAttachments(attachment);
};

export const scheduledNotification = async (params: any) => {
  const { notificationId, courseId } = params;
  const notification = await getNotificationInformation(notificationId);
  const { locations, notificationForStudentWho } = notification;

  const completionStatus = await getStudentCompletionStatusForCourse(courseId);
  const studentIds = [];
  if (
    !notificationForStudentWho.length ||
    notificationForStudentWho.includes(
      NotificationConstants.NOTIFICATION_FOR_STUDENTS_WHO.NOT_COMPLETED_COURSE
    )
  ) {
    studentIds.push(...completionStatus.notCompleted);
  }
  if (
    !notificationForStudentWho.length ||
    notificationForStudentWho.includes(
      NotificationConstants.NOTIFICATION_FOR_STUDENTS_WHO.COMPLETED_COURSE
    )
  ) {
    studentIds.push(...completionStatus.completed);
  }

  const students = await getUserDetails(studentIds, {
    location: { $in: locations },
  });

  const course: any = await getCourseDetails(courseId);

  // TODO for attachment, download files locally and pass absolute path
  const requestId = generateRandomString(8);
  const attachment: any = await downloadAttachments(
    notification.emailSpec?.attachment?.objectUrl
      ? [notification.emailSpec?.attachment?.objectUrl]
      : [],
    requestId
  );

  for (const student of students) {
    const { _id, name, lastName, mobileNo, email } = student;
    const fullName = getFullName(name, lastName);
    const placeHolderValues: any = {
      [NotificationConstants.TEMPLATE_PLACE_HOLDERS.STUDENT_NAME]: fullName,
      [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]:
        course.certificateDetails?.title ?? course.title,
    };

    const recipients = [{ name: fullName, email, mobileNo }];
    const content = generateMessageContent({
      notification,
      contentData: {
        placeHolderValues,
        attachment,
        toEmail: recipients.map((r) => r.email),
        toMobileNo: recipients[0].mobileNo,
      },
    });

    await queueNotificationMessage({
      courseId,
      userType: notification.userType,
      notificationType: notification.notificationType,
      requestId,
      notificationId,
      userId: _id,
      recipients,
      notificationContent: content,
    });
  }
};

export const getCourseEnrollmentAndCompletionReport = async (params: any) => {
  const { notificationId, courseId } = params;
  const notification = await getNotificationInformation(notificationId);
  const course: any = await getCourseDetails(courseId);
  const {
    locations: forLocations,
    notificationType,
    schedule: {
      recurring: { interval },
    },
  } = notification;

  const duration =
    interval === NotificationConstants.RECURRING_INTERVAL.MONTHLY
      ? "month"
      : interval === NotificationConstants.RECURRING_INTERVAL.WEEKLY
        ? "week"
        : "day";

  const currentDate = moment().tz(USER_TZ);
  const startDate = currentDate.clone().startOf("day").subtract(1, duration);

  // get records
  const locations = forLocations.map((l: any) => l.toString());
  const courseName = course.certificateDetails?.title ?? course.title;
  let report: any;
  if (
    notificationType ===
    NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENTS_ENROLLED_LIST
  )
    report = await studentsEnrolledReport({
      courseId,
      locations,
      fromDate: startDate.toDate(),
      toDate: currentDate.toDate(),
      courseName,
    });
  else
    report = await studentsCompletedCourseReport({
      courseId,
      locations,
      fromDate: startDate.toDate(),
      toDate: currentDate.toDate(),
      courseName,
    });

  const { headers, records } = report;

  // create csv

  const requestId = generateRandomString(8);
  const tempDir = path.join(path.resolve(), "temp");
  const downloadDirectory = `${tempDir}/${requestId}`;
  fs.mkdirSync(downloadDirectory, { recursive: true });

  const fileName = `${Date.now()}_${courseName.replace(
    /[^a-zA-Z_]/g,
    "_"
  )}.csv`;
  const filePath = `${downloadDirectory}/${fileName}`;
  await createCSVFile({ headers, reportData: records, filePath });

  // upload to s3
  const s3Url = await uploadFileToS3({
    filePath,
    destS3Path: `reports/${fileName}`,
  });
  const attachment: any = await downloadAttachments(
    notification.emailSpec?.attachment?.objectUrl
      ? [notification.emailSpec?.attachment?.objectUrl]
      : [],
    requestId
  );
  attachment.push({ fileName, path: filePath, downloadLink: s3Url });

  // create message
  const placeHolderValues: any = {
    [NotificationConstants.TEMPLATE_PLACE_HOLDERS.COURSE_NAME]: courseName,
  };

  const recipients = await getUserDetails(
    notification.recipients.map((r: any) => r._id)
  );
  const otherRecipients = notification.otherRecipients
    ? notification.otherRecipients.split(",")
    : [];

  const recipientsForLog = recipients.map((u: any) => {
    return {
      name: getFullName(u.name, u.lastName),
      email: u.email,
      mobileNo: u.mobileNo,
    };
  });
  recipientsForLog.push(...otherRecipients.map((email: any) => ({ email })));

  const toEmail = [...recipients.map((el) => el.email), ...otherRecipients];
  const content = generateMessageContent({
    notification,
    contentData: {
      placeHolderValues,
      attachment,
      toEmail,
    },
  });

  // send message
  await queueNotificationMessage({
    courseId,
    userType: notification.userType,
    notificationType: notification.notificationType,
    requestId,
    notificationId,
    userId: "NA",
    recipients: recipientsForLog,
    notificationContent: content,
  });
};
const studentsEnrolledReport = async (params: any) => {
  const { courseId, locations, fromDate, toDate, courseName } = params;

  const headers = {
    enrolledOn: "Enrolled At",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    mobileNo: "Telephone",
    courseName: "Course",
  };

  const records: any = [];

  // get records
  const studentProgressRecords: any = await studentProgressModel(app)
    .find({
      courseId: courseId,
      joinedDate: { $gte: fromDate, $lte: toDate },
    })
    .populate({
      path: "userId",
      select: "_id name lastName email mobileNo location",
    })
    .lean();

  for (const progress of studentProgressRecords.filter((r: any) =>
    locations.includes(r.userId.location.toString())
  )) {
    const {
      joinedDate,
      userId: { name, lastName, email, mobileNo },
    } = progress;
    const rec = {
      enrolledOn: moment(joinedDate)
        .tz(USER_TZ)
        .format("MMM DD, YYYY @ hh:mm A"),
      firstName: name ?? "",
      lastName: lastName ?? "",
      email,
      mobileNo,
      courseName,
    };
    records.push(rec);
  }

  return {
    headers,
    records,
  };
};

const studentsCompletedCourseReport = async (params: any) => {
  const { courseId, locations, fromDate, toDate } = params;

  const studentProgressDocuments: any = await studentProgressModel(app)
    .find({
      courseId,
      completedAt: { $gte: fromDate, $lte: toDate },
      certificateUrl: { $exists: true, $ne: null },
    })
    .populate("userId")
    .lean();

  // Get course details once
  const courseDetails: any = await getCourseDetails(courseId);

  const headers = {
    submissionTime: "Submission Time",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email Address",
    mobileNo: "Telephone",
    courseName: "Course Name",
    certificateUrl: "Certificate",
  };

  const records: any = [];

  for (const completedCourse of studentProgressDocuments) {
    const location = completedCourse.userId.location;
    if (!locations.includes(location.toString())) continue;

    const userId = completedCourse.userId._id;
    const name = completedCourse.userId.name;
    const lastName = completedCourse.userId.lastName;
    const mobileNo = completedCourse.userId.mobileNo;
    const completedAt = completedCourse.completedAt;
    const email = completedCourse.userId.email;
    const courseName = courseDetails.title;
    const certificateLink = completedCourse.certificateUrl ?? "";

    if (!certificateLink) continue;

    const rec = {
      submissionTime: moment(completedAt)
        .tz(USER_TZ)
        .format("MMM DD, YYYY @ hh:mm A"),
      firstName: name ?? "",
      lastName: lastName ?? "",
      email,
      mobileNo,
      courseName,
      certificateUrl: certificateLink,
    };
    records.push(rec);
  }

  return {
    headers,
    records,
  };
};

const getFullName = (firstName: any, lastName: any) => {
  let fullName = "";
  if (firstName) {
    fullName += firstName;
  }
  if (lastName) {
    if (fullName) fullName += " ";
    fullName += lastName;
  }

  return fullName;
};
