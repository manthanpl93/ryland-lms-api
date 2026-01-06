import cron from "node-cron";
import app from "../app";
import studentProgressModel from "../models/student-progress.model";
import createPublishedCoursesModel from "../models/published-courses.model";
import { sendEmail } from "../utils/email";
import fs from "fs";
import path from "path";
import moment from "moment-timezone";
import configuration from "@feathersjs/configuration";
const { userTimeZone: USER_TZ = "America/New_York", aws } = configuration()();
import * as AWS from "aws-sdk";
import categoriesModel from "../models/categories.model";

AWS.config.update({ region: aws.s3BucketRegion });
const s3 = new AWS.S3();

const weeklyScheduler = () => {
  sendLastWeekCourseCompletedUserReport();
};

const sendLastWeekCourseCompletedUserReport = () => {
  cron.schedule(
    process.env.NODE_ENV === "production" ? "0 7 * * 1" : "0 * * * *",
    async function () {
      await getLastWeekCourseCompletionReport(true);
    },
    {
      scheduled: true,
      timezone: USER_TZ,
    }
  );
};

// this function is for local to check the job

// const sendLastWeekCourseCompletedUserReport = () => {
//   cron.schedule(
//     "57 12 * * *", // ← Triggers at 6:06 PM IST daily
//     async function () {
//       console.log("🕕 Running scheduled report at 6:06 PM IST...");
//       await getLastWeekCourseCompletionReport(true);
//     },
//     {
//       scheduled: true,
//       timezone: "Asia/Kolkata",
//     }
//   );
// };

export const getLastWeekCourseCompletionReport = async (sendMail = false) => {
  const uploadReportToS3 = async (filePath: string) => {
    try {
      const fileKey = `reports/${new Date().getTime()}_${filePath.slice(
        filePath.lastIndexOf("/") + 1
      )}`;
      const fileStream = fs.createReadStream(filePath);
      const fileUrl = `${aws.cloudFrontUrl}/${fileKey}`;
      const params = {
        Bucket: aws.s3BucketName,
        Key: fileKey,
        Body: fileStream,
        // ACL: "public-read",
      };
      await s3.upload(params).promise();
      return fileUrl;
    } catch (error) {
      console.log("s3bucket upload error", error);
    }
  };
  // console.log("last week scheduler called ======", app.get("userTimeZone"));
  console.log("called cron fn=============================");

  const todayMoment = moment().tz(USER_TZ);
  let lastWeekStart;
  let lastWeekEnd;
  if (process.env.NODE_ENV === "production") {
    lastWeekStart = todayMoment
      .clone()
      .subtract(1, "week")
      .startOf("week")
      .add(1, "day");
    lastWeekEnd = lastWeekStart.clone().endOf("week").add(1, "day");
  } else {
    lastWeekStart = todayMoment.clone().startOf("week");
    lastWeekEnd = lastWeekStart.clone().endOf("week");
  }

  const studentProgressDocuments: any = await studentProgressModel(app)
    .find({
      completedAt: { $gte: lastWeekStart.toDate(), $lte: lastWeekEnd.toDate() },
    })
    .populate("userId")
    .lean();

  const locationWiseData: Record<
    string,
    { reportData: string[]; hrEmails: string[]; courseTitle: string }
  > = {};

  const defaultEmails = ["hrs@xtcare.com", "tech.support@teampumpkin.com"];

  for (const completedCourse of studentProgressDocuments) {
    const user = completedCourse.userId;
    const locationId = user?.location?.toString();

    const completedAt = completedCourse.completedAt;
    const certificateUrl = completedCourse.certificateUrl;

    if (!completedAt || !certificateUrl) continue;

    // Get published course details
    const publishedCourse: any = await createPublishedCoursesModel(app)
      .findOne({ mainCourse: completedCourse.courseId })
      .select("title")
      .lean();

    const category = await categoriesModel(app).findById(locationId);

    const hrEmails = new Set([...defaultEmails, ...(category?.hrEmails || [])]);

    const row = [
      moment(completedAt)
        .tz(USER_TZ)
        .format("MMM DD, YYYY @ hh:mm A"),
      user.name ?? "",
      user.lastName ?? "",
      user.email ?? "",
      user.mobileNo ?? "",
      publishedCourse?.title ?? "",
      certificateUrl,
    ]
      .map((val) => `"${val}"`)
      .join(",");

    // Ensure initialization even if already present
    if (!locationWiseData[locationId]) {
      locationWiseData[locationId] = {
        reportData: [
          "Submission Time,First Name,Last Name,Email Address,Telephone,Course Name,Certificate",
        ],
        hrEmails: Array.from(hrEmails),
        courseTitle: publishedCourse?.title,
      };
    }

    // Append row
    locationWiseData[locationId].reportData.push(row);

    // Ensure we merge new hrEmails if added later
    locationWiseData[locationId].hrEmails = Array.from(
      new Set([
        ...locationWiseData[locationId].hrEmails,
        ...Array.from(hrEmails),
      ])
    );
  }

  for (const [
    locationId,
    { reportData, hrEmails, courseTitle },
  ] of Object.entries(locationWiseData)) {
    if (reportData.length <= 1) continue; // Only headers, no data

    const filePath = path.join(
      path.resolve(__dirname, "../..", "public"),
      `course_completion_report_${locationId}_${todayMoment.format(
        "YYYY_MM_DD"
      )}.csv`
    );

    const reportDataCSV = reportData.join("\n");
    await stringToFile(reportDataCSV, filePath);
    const reportLink = await uploadReportToS3(filePath);

    if (sendMail) {
      const message = `
        <div style="font-size: 14px">
          <p>Hi Xtreme Employee,</p>
          <p>Please find the list of course completions from your location below:</p>
          <div>
            <ul>
              <li>Total Submissions: ${reportData.length - 1}</li>
              <li><a href="${reportLink}">View Document</a></li>
            </ul>
          </div>
        </div>
      `;

      await sendEmail({
        to: [...new Set(hrEmails)],
        subject: `Weekly Course Completion Report - ${courseTitle}`,
        message,
        attachments: [
          {
            path: filePath,
            filename: "weekly_completion_report.csv",
          },
        ],
      });

      fs.unlinkSync(filePath); // Clean up local file
    }
  }
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

export default weeklyScheduler;
