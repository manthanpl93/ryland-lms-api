/**
 * Class Leaderboard Model
 * 
 * Minimal model for Feathers service structure.
 * This service uses Redis, not MongoDB, so this model is just for service initialization.
 */

import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export default function (app: Application): Model<any> {
  const modelName = "classLeaderboard";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  // Minimal schema - not actually used since we use Redis
  const classLeaderboardSchema = new Schema(
    {
      // Empty schema - this model is not used
      _placeholder: {
        type: String,
        default: "not-used",
      },
    },
    {
      timestamps: false,
      strict: false,
    }
  );

  // This is necessary to avoid model compilation errors in watch mode
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, classLeaderboardSchema);
}
