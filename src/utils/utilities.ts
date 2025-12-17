import app from "../app";
import twilio from "twilio";
import configuration from "@feathersjs/configuration";
const { countryCode = "+1", API_URL, aws } = configuration()();
import studentProgressModel from "../models/student-progress.model";
import createPublishedCoursesModel from "../models/published-courses.model";
import generateCertificate from "./certificate-generator";
import { generatePDF } from "./pdf-generator";
import moment from "moment-timezone";
import { sendEmail } from "./email";
import * as AWS from "aws-sdk";
import fs from "fs";
import mongoose from "mongoose";
import CategoriesModel from "../models/categories.model";
import categoriesModel from "../models/categories.model";
import usersModel from "../models/users.model";

AWS.config.update({ region: aws.s3BucketRegion });
const s3 = new AWS.S3();

export const generateRandomString = (length: number) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
};

export const sendSMS = async (mobileNo: string, message: string) => {
  console.log("send SMS----", mobileNo, " - ", message);
  if (process.env.NODE_ENV === "development") return;
  const twilioCreds = app.get("twilio");
  const { accountSid, authToken, from } = twilioCreds;
  try {
    const client = twilio(accountSid, authToken);
    const resp = await client.messages.create({
      body: message,
      to: `${countryCode}${mobileNo}`, // Text your number
      from: from, // From a valid Twilio number
    });
    return resp;
  } catch (err) {
    console.log("Error occurred while sending SMS", err);
    return err;
  }
};

export const sendSmsVerifyCode = (to: string, channel: string = "sms") => {
  try {
    if (process.env.NODE_ENV === "development") return;
    const twilioCreds = app.get("twilio");
    const { accountSid, authToken, from } = twilioCreds;
    const client = twilio(accountSid, authToken);
    client.verify.v2.services("cdscds").verifications.create({
      to,
      channel,
    });
  } catch (error) {
    throw error;
  }
};

export const smsCheckVerifyCode = (to: string, code: string) => {
  try {
    if (process.env.NODE_ENV === "development") return;
    const twilioCreds = app.get("twilio");
    const { accountSid, authToken, from } = twilioCreds;
    const client = twilio(accountSid, authToken);
    client.verify.v2.services("cdscds").verificationChecks.create({
      to,
      code,
    });
  } catch (error) {
    throw error;
  }
};

export const sendNotificationForCourseCompletion = async (
  courseId: any,
  userId: any
) => {
  try {
    let completionDetails: any = {};
    
    // Fetch student progress
    const studentProgress: any = await studentProgressModel(app)
      .findOne({ userId, courseId })
      .lean();
    
    if (!studentProgress) return;

    // Fetch published course
    const publishedCourse: any = await createPublishedCoursesModel(app)
      .findOne({ mainCourse: courseId })
      .lean();
    
    if (!publishedCourse) return;

    // Fetch user details
    const user: any = await usersModel(app).findById(userId).lean();
    if (!user) return;

    const hasAssignment = publishedCourse.assignments?.length > 0;
    const courseCompleted =
      studentProgress.progressPercentage === 100 &&
      studentProgress.completedAt;

    if (courseCompleted) {
      completionDetails.date = moment(studentProgress.completedAt).format(
        "MM-DD-YYYY"
      );
    }

    const category = await CategoriesModel(app)
      .findOne({
        _id: user?.location,
      })
      .lean();

    if (!courseCompleted) return;

    completionDetails = {
      ...completionDetails,
      firstName: user.name ?? "",
      lastName: user.lastName ?? "",
      mobileNo: user.mobileNo,
      courseName:
        publishedCourse?.certificateDetails?.title ??
        publishedCourse?.title,
      instructorName:
        publishedCourse?.certificateDetails?.instructorName ?? "",
      courseDetails:
        publishedCourse?.certificateDetails?.courseDetails ?? "",
      courseDuration:
        publishedCourse?.certificateDetails?.courseDuration ?? "",
      designationTitle:
        publishedCourse?.certificateDetails?.designationTitle ?? "",
      designationSubTitle:
        publishedCourse?.certificateDetails?.designationSubTitle ?? "",
      leftLogo: category?.certificateLogo?.objectUrl,
      centerLogo: category?.certificateIcon?.objectUrl,
      courseTitle: publishedCourse?.title,
    };

    let imgFileResp: any, pdfFileResp: any;
    let certificateDownload = "";
    let subject = "";
    let certificateLink = "";
    if (hasAssignment) {
      imgFileResp = await generateCertificate(completionDetails);
      pdfFileResp = await generatePDF(imgFileResp.absolutePath);

      console.log("file path ==== ", imgFileResp, pdfFileResp);
      certificateLink = await saveFileToS3(pdfFileResp.absolutePath);
      
      // Update student progress with certificate URL
      await studentProgressModel(app).findByIdAndUpdate(
        studentProgress._id,
        {
          certificateUrl: certificateLink,
        }
      );

      subject = `Certificate for ${completionDetails.firstName} ${completionDetails.lastName} - ${completionDetails.courseName}`;

      certificateDownload = `
 <p>
  You can download the HHA's Certificate of Completion here:
</p>
<a href="${certificateLink}">Download</a>
    `;
    } else {
      subject = `Course completed by ${completionDetails.firstName} ${completionDetails.lastName} - ${completionDetails.courseName}`;
    }

    const messageData: any = {
      "Legal Name": `${completionDetails.firstName} ${completionDetails.lastName}`,
      Phone: completionDetails.mobileNo,
      "I consent to my information being sent to X-Treme Care LLC and its subsidiaries for the purpose of employment documentation":
        "checked",
    };
    const message = `
    <p>
This HHA has successfully completed the ${completionDetails.courseName} ${
  certificateDownload
    ? "and has earned a Certificate of Completion for his/her file"
    : ""
}. </p>
<p>
  The following information has been entered by the HHA following course completion:
</p>
<ol>

${Object.keys(messageData)
    .map((key: any) => {
      return `<li> <div style="display: flex; flex-direction: column;">
  <div style="font-weight: bold;">
    ${key}:
  </div>
  <div style="margin-left: 8px">
  ${messageData[key]}
  </div>
  </div>
  </li>`;
    })
    .join("")}

</ol>
${certificateDownload}
    `;

    const attachments: any[] = [];
    const to: string[] = [];

    if (courseCompleted && imgFileResp) {
      const userLocation: any = user?.location;

      // Find the location category from the categories collection
      const category = await categoriesModel(app).findById(userLocation);

      if (category?.hrEmails?.length) {
        for (const email of category.hrEmails) {
          if (!to.includes(email)) {
            to.push(email);
          }
        }
      }

      attachments.push({
        filename: "Certificate.pdf",
        path: pdfFileResp?.absolutePath,
      });
    }

    await sendEmail({
      to,
      subject,
      message,
      attachments,
    });

    fs.unlinkSync(imgFileResp?.absolutePath);
    fs.unlinkSync(pdfFileResp?.absolutePath);
  } catch (e) {
    console.log("e------", e);
  }
};

const saveFileToS3 = async (filePath: string) => {
  const fileStream = fs.createReadStream(filePath);
  const fileKey =
    "certificates/" + filePath.slice(filePath.lastIndexOf("/") + 1);
  const params = {
    Bucket: aws.s3BucketName,
    Key: fileKey,
    Body: fileStream,
    // ACL: "public-read",
  };
  const url = `https://${aws.cloudFrontUrl}/${fileKey}`;
  await s3.upload(params).promise();
  return url;
};

export const uploadFileToS3 = async (fileDetails: any) => {
  const { filePath, destS3Path } = fileDetails;
  const fileStream = fs.createReadStream(filePath);
  const params = {
    Bucket: aws.s3BucketName,
    Key: destS3Path,
    Body: fileStream,
    // ACL: "public-read",
  };
  const url = `https://${aws.cloudFrontUrl}/${destS3Path}`;
  await s3.upload(params).promise();
  return url;
};

export const copyS3File = async (sourceUrl: string, newFileName?: string) => {
  const uid = newFileName || new mongoose.Types.ObjectId().toString();
  const fileName = sourceUrl.substring(sourceUrl.lastIndexOf("/") + 1);
  const fileExt = sourceUrl.substring(sourceUrl.lastIndexOf(".") + 1);
  const newFileKey = `${uid}.${fileExt}`;
  
  const copyParams = {
    Bucket: aws.s3BucketName,
    CopySource: `/${aws.s3BucketName}/${fileName}`,
    Key: newFileKey,
    // ACL: "public-read",
  };
  
  await s3.copyObject(copyParams).promise();
  const copyObjectUrl = `https://${aws.cloudFrontUrl}/${newFileKey}`;
  
  return {
    newFileKey,
    newFileUrl: copyObjectUrl
  };
};
