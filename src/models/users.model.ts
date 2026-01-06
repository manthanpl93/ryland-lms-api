// users-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export const userStatuses = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

export const userRoles = [
  { value: "Student", label: "Student" },
  { value: "Teacher", label: "Teacher" },
  { value: "Admin", label: "Admin" },
];

export default function (app: Application): Model<any> {
  const modelName = "users";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const schema = new mongooseClient.Schema(
    {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, unique: true, trim: true },
      mobileNo: { type: String, trim: true }, 
      schoolId: {
        type: mongooseClient.Schema.Types.ObjectId,
        ref: "schools",
        required: false,
        index: true,
      },
      address: { type: String, required: false, trim: true },
      role: {
        type: String,
        required: true,
        enum: userRoles.map((r) => r.value),
      },
      status: {
        type: String,
        enum: userStatuses.map((s) => s.value),
        default: "Active",
      },
      otp: { type: Number },
      otpGeneratedAt: { type: Date },
      resetPasswordToken: {
        type: String,
      },
      resetPasswordTokenGeneratedAt: { type: Date },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    },
  );

  // Virtual for full name
  schema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
  });

  // Virtual for courses enrolled
  schema.virtual("coursesEnrolled", {
    ref: "studentProgress",
    localField: "_id",
    foreignField: "userId",
  });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}

