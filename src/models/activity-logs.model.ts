import { Application } from "../declarations";
import { Model, Mongoose, Schema } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "activitylogs";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const schema = new mongooseClient.Schema(
    {
      activity: { type: String },
      byUser: { type: Schema.Types.ObjectId, required: true, ref: "users" },
      forUser: { type: Schema.Types.ObjectId, required: true, ref: "users" },
    },
    {
      timestamps: true,
    }
  );

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}
