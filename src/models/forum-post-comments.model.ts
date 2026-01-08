// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "forumPostComments";
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
      parentCommentId: {
        type: Schema.Types.ObjectId,
        ref: "forumPostComments",
        default: null,
        index: true,
      },
      content: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 5000,
      },
      authorId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      // Denormalized vote counters
      upvotes: {
        type: Number,
        default: 0,
        min: 0,
      },
      downvotes: {
        type: Number,
        default: 0,
        min: 0,
      },
      voteScore: {
        type: Number,
        default: 0,
      },
      // Nested reply support
      replyCount: {
        type: Number,
        default: 0,
        min: 0,
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
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
        default: null,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Compound indexes for efficient queries
  schema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });
  schema.index({ postId: 1, isDeleted: 1, voteScore: -1 });

  // Virtual for author population
  schema.virtual("author", {
    ref: "users",
    localField: "authorId",
    foreignField: "_id",
    justOne: true,
  });

  // Virtual for replies population
  schema.virtual("replies", {
    ref: "forumPostComments",
    localField: "_id",
    foreignField: "parentCommentId",
  });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

