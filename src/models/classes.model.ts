// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "classes";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const forumSettingsSchema = new Schema(
    {
      enableClassForum: { type: Boolean, default: false },
      enableCourseForum: { type: Boolean, default: false },
      enableAllCourses: { type: Boolean, default: false },
      selectedCourses: [{ type: Schema.Types.ObjectId, ref: "courses" }],
    },
    { _id: false }
  );

  const messagingSettingsSchema = new Schema(
    {
      enableMessaging: { type: Boolean, default: false },
      enableAllTeachers: { type: Boolean, default: false },
      selectedTeachers: [{ type: Schema.Types.ObjectId, ref: "users" }],
    },
    { _id: false }
  );

  const classesSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
      },
      schoolId: {
        type: Schema.Types.ObjectId,
        ref: "schools",
        required: true,
        index: true,
      },
      // Counters (denormalized for performance)
      totalStudents: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalCourses: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Forum Configuration
      forumSettings: {
        type: forumSettingsSchema,
        default: () => ({}),
      },
      // Messaging Configuration
      messagingSettings: {
        type: messagingSettingsSchema,
        default: () => ({}),
      },
      // Soft delete
      isDeleted: {
        type: Boolean,
        default: false,
      },
      deletedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes for efficient queries
  classesSchema.index({ schoolId: 1, status: 1 });
  classesSchema.index({ name: 1, schoolId: 1 });
  classesSchema.index({ isDeleted: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, classesSchema);
}

