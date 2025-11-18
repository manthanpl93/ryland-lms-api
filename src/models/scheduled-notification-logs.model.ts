import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";
import { NotificationConstants } from "../utils/constants";

export default function (app: Application): Model<any> {
  const modelName = "schedulednotificationlogs";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const recipient = new Schema({
    name: { type: String },
    email: { type: String },
    mobileNo: { type: String },
    userId: {
      type: Schema?.Types.ObjectId,
      ref: "users",
    },
  });

  const attachment = new Schema({
    fileName: { type: String },
    downloadLink: { type: String },
  });

  const content = new Schema({
    title: { type: String, default: null },
    message: { type: String },
    attachment: { type: [attachment] },
  });

  const eventHistory = new Schema({
    event: { type: String, enum: NotificationConstants.NOTIFICATION_STATUS },
    time: { type: Date },
  });

  const schema = new Schema(
    {
      courseId: { type: Schema?.Types.ObjectId, ref: "courses", default: null },
      notificationId: {
        type: Schema?.Types.ObjectId,
        ref: "notificationschedules",
      },
      requestId: { type: String },
      userType: { type: String, enum: ["author", "student"] },
      notificationType: {
        type: String,
        enum: [
          ...Object.values(NotificationConstants.STUDENT_NOTIFICATION_TYPES),
          ...Object.values(NotificationConstants.AUTHOR_NOTIFICATION_TYPES),
        ],
      },
      recipients: { type: [recipient] },
      lastStatus: {
        type: String,
        enum: NotificationConstants.NOTIFICATION_STATUS,
      },
      via: { type: String, enum: ["sms", "email"] },
      content: { type: content },
      errorStackTrace: { type: Object },
      response: { type: Object },
      eventHistory: { type: [eventHistory] },
    },
    {
      timestamps: true,
    },
  );

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}
