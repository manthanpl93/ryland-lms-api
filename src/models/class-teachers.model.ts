// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "classTeachers";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const classTeachersSchema = new Schema(
    {
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: true,
        index: true,
      },
      teacherId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      // Teacher assignment details
      assignedDate: {
        type: Date,
        default: Date.now,
      },
      // Optional metadata
      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
      // Active status
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Compound Indexes for efficient queries
  // Prevent duplicate teacher assignments
  classTeachersSchema.index({ classId: 1, teacherId: 1 }, { unique: true });
  // Find all classes for a teacher
  classTeachersSchema.index({ teacherId: 1, isActive: 1 });
  // Find all teachers in a class
  classTeachersSchema.index({ classId: 1, isActive: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, classTeachersSchema);
}

