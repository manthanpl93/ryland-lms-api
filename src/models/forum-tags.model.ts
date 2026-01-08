// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "forumTags";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      communityId: {
        type: Schema.Types.ObjectId,
        ref: "communities",
        required: true,
        index: true,
      },
      color: {
        type: String,
        default: "#3B82F6",
      },
      usageCount: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
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

  // Unique compound index: no duplicate tag names per community
  schema.index({ name: 1, communityId: 1 }, { unique: true });
  
  // Compound index for efficient queries
  schema.index({ communityId: 1, isActive: 1, usageCount: -1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

