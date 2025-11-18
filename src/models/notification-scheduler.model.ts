// notification scheduler-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";
import { NotificationConstants } from "../utils/constants";

export default function (app: Application): Model<any> {
  const modelName = "notificationschedules";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const recurringSchema = new Schema({
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
    neverEnd: { type: String },
    time: { type: String },
    interval: {
      type: String,
      enum: NotificationConstants.RECURRING_INTERVAL,
    },
    weekDays: { type: Array },
    monthDates: { type: Array },
  });

  const scheduleSchema = new Schema({
    dates: { type: Array },
    time: { type: String },
    recurring: { type: recurringSchema, default: null },
  });

  const schema = new Schema(
    {
      courseId: { type: Schema?.Types.ObjectId, ref: "courses" },
      name: { type: String },
      active: { type: Boolean, default: true },
      userType: { type: String, enum: ["author", "student"] },
      createdBy: { type: Schema?.Types.ObjectId, ref: "users" },
      notificationType: {
        type: String,
        enum: [
          ...Object.values(NotificationConstants.STUDENT_NOTIFICATION_TYPES),
          ...Object.values(NotificationConstants.AUTHOR_NOTIFICATION_TYPES),
        ],
      },
      locations: { type: [Schema?.Types.ObjectId], ref: "categories" },
      via: { type: [String], enum: ["sms", "email"] },
      smsSpec: { template: { type: String } },
      emailSpec: {
        subject: { type: String },
        template: { type: String },
        attachment: { type: Object },
        attachCertificate: { type: Boolean },
      },
      recipients: [
        { _id: { type: Schema?.Types.ObjectId, ref: "users" }, email: String },
      ],
      otherRecipients: { type: String },
      notificationForStudentWho: {
        type: [String],
        enum: NotificationConstants.NOTIFICATION_FOR_STUDENTS_WHO,
      },
      schedule: { type: scheduleSchema, default: null },
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
