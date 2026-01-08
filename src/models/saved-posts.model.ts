// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "savedPosts";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      postId: {
        type: Schema.Types.ObjectId,
        ref: "forumPosts",
        required: true,
        index: true,
      },
      savedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Unique compound index: can't save same post twice
  schema.index({ userId: 1, postId: 1 }, { unique: true });
  
  // Compound index for sorted retrieval
  schema.index({ userId: 1, savedAt: -1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

