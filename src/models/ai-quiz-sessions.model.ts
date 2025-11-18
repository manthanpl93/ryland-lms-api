import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";
import { AI_QUIZ_STATUS, QUESTION_TYPES, DIFFICULTY_LEVELS, SUPPORTED_FILE_TYPES } from "../utils/consts/ai-quiz-constants";

export default function (app: Application): Model<any> {
  const modelName = "aiQuizSessions";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const schema = new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
      courseId: { type: Schema.Types.ObjectId, ref: "courses", required: true },
      sessionId: { type: String, required: true, unique: true },
      status: {
        type: String,
        enum: Object.values(AI_QUIZ_STATUS),
        default: AI_QUIZ_STATUS.PENDING
      },
      files: [{
        fileName: { type: String, required: true },
        fileType: { 
          type: String, 
          enum: SUPPORTED_FILE_TYPES, 
          required: true 
        },
        s3Url: { type: String, required: true },
        fileSize: { type: Number },
        processedAt: { type: Date },
        extractedTextLength: { type: Number },
        chunksCount: { type: Number }
      }],
      settings: {
        questionCount: { 
          type: Number, 
          default: 10,
          min: 5,
          max: 50
        },
        questionTypes: [{
          type: String,
          enum: Object.values(QUESTION_TYPES)
        }],
        difficulty: { 
          type: String, 
          enum: Object.values(DIFFICULTY_LEVELS), 
          default: DIFFICULTY_LEVELS.MEDIUM 
        },
        language: { type: String, default: "en" }
      },
      progress: {
        filesProcessed: { type: Number, default: 0 },
        totalFiles: { type: Number, default: 0 },
        questionsGenerated: { type: Number, default: 0 },
        duplicatesRemoved: { type: Number, default: 0 },
        currentStep: { type: String, default: "Queued" },
        percentage: { type: Number, default: 0 },
        estimatedCompletion: { type: Date }
      },
      error: {
        message: { type: String },
        code: { type: String },
        step: { type: String },
        timestamp: { type: Date }
      },
      queuePosition: { type: Number },
      startedAt: { type: Date },
      completedAt: { type: Date }
    },
    { timestamps: true }
  );

  schema.index({ userId: 1, createdAt: -1 });
  schema.index({ sessionId: 1 });
  schema.index({ status: 1, createdAt: -1 });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, schema);
} 