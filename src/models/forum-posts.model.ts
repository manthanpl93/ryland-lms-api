// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import type { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "forumPosts";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 300,
      },
      content: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 10000,
      },
      authorId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      communityId: {
        type: Schema.Types.ObjectId,
        ref: "communities",
        required: true,
        index: true,
      },
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: true,
        index: true,
      },
      // Tags stored as references
      tags: {
        type: [{ type: Schema.Types.ObjectId, ref: "forumTags" }],
        default: [],
        validate: {
          validator: function(v: any[]) {
            return v.length <= 5;
          },
          message: "A post can have maximum 5 tags"
        },
        index: true, // Multikey index for array
      },
      // Denormalized counters for performance
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
        index: true,
      },
      commentCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Soft delete support
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
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

  // Compound indexes for efficient feed queries
  schema.index({ communityId: 1, isDeleted: 1, createdAt: -1 }); // New posts
  schema.index({ communityId: 1, isDeleted: 1, voteScore: -1 }); // Top posts
  schema.index({ communityId: 1, tags: 1, isDeleted: 1 }); // Filter by tag within community
  schema.index({ classId: 1, tags: 1, isDeleted: 1 }); // Filter by tag within class
  schema.index({ tags: 1, isDeleted: 1, createdAt: -1 }); // Filter by tag across posts

  // Virtual for author population
  schema.virtual("author", {
    ref: "users",
    localField: "authorId",
    foreignField: "_id",
    justOne: true,
  });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, schema);
}

