import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";
import {
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
} from "../utils/consts/ai-quiz-constants";

export default function (app: Application): Model<any> {
  const modelName = "questionCache";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      questionHash: { type: String, required: true, index: true },
      normalizedQuestion: { type: String, required: true },
      type: {
        type: String,
        enum: Object.values(QUESTION_TYPES),
        required: true,
      },
      courseId: { type: Schema.Types.ObjectId, ref: "courses", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
      usageCount: { type: Number, default: 1 },
      difficulty: {
        type: String,
        enum: Object.values(DIFFICULTY_LEVELS),
      },
      language: { type: String, default: "en" },
    },
    { timestamps: true }
  );

  schema.index({ courseId: 1, questionHash: 1 });
  schema.index({ normalizedQuestion: "text" });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
}
