// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "forumPostVotes";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      postId: {
        type: Schema.Types.ObjectId,
        ref: "forumPosts",
        required: true,
        index: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      voteType: {
        type: String,
        enum: ["upvote", "downvote"],
        required: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Unique compound index: one vote per user per post
  schema.index({ postId: 1, userId: 1 }, { unique: true });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

