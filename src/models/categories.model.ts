// categories-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose, Schema } from "mongoose";

interface ValidatorContext {
  type?: string;
  isParentLocation?: boolean;
}

export default function (app: Application): Model<any> {
  const modelName = "categories";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const assetSchema = new Schema(
    {
      status: { type: String, enum: ["finished"], required: true },
      objectUrl: { type: String, required: true },
      fileName: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
    },
    { _id: false }
  );

  const locationAttributesSchema = new Schema(
    {
      isParentLocation: { type: Boolean, default: false },
      parentLocation: {
        type: Schema.Types.ObjectId,
        ref: "categories",
        validate: {
          validator: function (this: ValidatorContext) {
            return !!this.isParentLocation;
          },
          message: "parentLocation is only allowed for parent locations",
        },
      },
      childLocations: {
        type: [{ type: Schema.Types.ObjectId, ref: "categories" }],
        validate: {
          validator: function (this: ValidatorContext) {
            return !!this.isParentLocation;
          },
          message: "childLocations is only allowed for parent locations",
        },
      },
      brandingLogo: {
        type: assetSchema,
        validate: {
          validator: function (this: ValidatorContext) {
            return !this.isParentLocation;
          },
          message: "brandingLogo is only allowed for child locations",
        },
      },
      certificateLogo: {
        type: assetSchema,
        validate: {
          validator: function (this: ValidatorContext) {
            return !this.isParentLocation;
          },
          message: "certificateLogo is only allowed for child locations",
        },
      },
      certificateIcon: {
        type: assetSchema,
        validate: {
          validator: function (this: ValidatorContext) {
            return !this.isParentLocation;
          },
          message: "certificateIcon is only allowed for child locations",
        },
      },
      hrEmails: {
        type: [String],
        default: undefined,
        validate: {
          validator: function (this: ValidatorContext) {
            return !this.isParentLocation;
          },
          message: "hrEmails is only allowed for child locations",
        },
      },
      abbreviation: {
        type: String,
        validate: {
          validator: function (this: ValidatorContext) {
            return !this.isParentLocation;
          },
          message: "abbreviation is only allowed for child locations",
        },
      },
      isActive: { type: Boolean, default: true },
    },
    { _id: false }
  );

  const schema = new Schema(
    {
      type: {
        type: String,
        enum: ["job-title", "location"],
        required: true,
      },
      name: { type: String, required: true },
      ...locationAttributesSchema.paths, // Spread the paths instead of the schema
    },
    {
      strict: false,
      timestamps: true,
    }
  );

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}
