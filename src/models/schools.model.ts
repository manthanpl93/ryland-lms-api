// schools-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export const schoolTypes = [
  { value: "public", label: "Public School" },
  { value: "private", label: "Private School" },
  { value: "charter", label: "Charter School" },
  { value: "online", label: "Online School" },
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "training", label: "Training Center" },
];

export const schoolStatuses = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];

export default function (app: Application): Model<any> {
  const modelName = "schools";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const schema = new mongooseClient.Schema(
    {
      schoolName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
      },
      schoolType: {
        type: String,
        required: true,
        enum: schoolTypes.map((t) => t.value),
      },
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      status: {
        type: String,
        enum: schoolStatuses.map((s) => s.value),
        default: "active",
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      deletedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    },
  );

  // Index for frequently queried fields
  schema.index({ schoolName: 1 });
  schema.index({ status: 1 });
  schema.index({ isDeleted: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}

