// notifications-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "notifications";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;
  const schema = new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "users", required: true },
      message: { type: String, required: true },
      type: {
        type: String,
        enum: [
          "author-added-to-course",
          "author-removed-from-course",
          "course-approved",
          "course-rejected",
        ],
        required: true,
      },
      course: { type: Schema.Types.ObjectId, ref: "courses" },
      done_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
      read: { type: Boolean, default: false },
      read_at: { type: Date },
      info: { type: Map, default: {} },
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
