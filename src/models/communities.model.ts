// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "communities";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        enum: ["class", "course"],
        required: true,
        index: true,
      },
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: true,
        index: true,
      },
      courseId: {
        type: Schema.Types.ObjectId,
        ref: "courses",
        default: null,
        index: true,
      },
      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes for efficient queries
  schema.index({ classId: 1, type: 1 });
  schema.index({ classId: 1, courseId: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

