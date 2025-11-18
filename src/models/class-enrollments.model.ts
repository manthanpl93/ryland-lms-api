// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "classEnrollments";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const classEnrollmentsSchema = new Schema(
    {
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: true,
        index: true,
      },
      studentId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      // Enrollment details
      enrollmentDate: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended", "Withdrawn"],
        default: "Active",
      },
      // Optional metadata
      enrolledBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Compound Indexes for efficient queries
  // Prevent duplicate enrollments
  classEnrollmentsSchema.index({ classId: 1, studentId: 1 }, { unique: true });
  // Find all classes for a student
  classEnrollmentsSchema.index({ studentId: 1, status: 1 });
  // Find all students in a class
  classEnrollmentsSchema.index({ classId: 1, status: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, classEnrollmentsSchema);
}

