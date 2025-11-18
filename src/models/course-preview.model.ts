// courses-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

interface OutlineItemProgress {
  _id?: string;
  itemId: string;
  category: "module" | "lesson";
  startDate?: Date;
  finishDate?: Date;
  completed?: "yes" | "no";
  totalLessonsFinished?: number;
  lessons?: OutlineItemProgress[]; // For modules only
  quizAttempts?: Array<{
    score: number;
    passed: boolean;
    questions: Array<{
      id: string;
      question: string;
      type: "multiple-choice" | "multi-select" | "true-false";
      options: string[];
      correctAnswers: string[];
    }>;
    userAnswers: Array<{
      questionId: string;
      selectedAnswers: string[];
      isCorrect: boolean;
    }>;
    submittedAt: Date;
  }>;
  lastQuizScore?: number;
  totalQuizAttempts?: number;
}

export interface CoursePreview {
  progressHistory: OutlineItemProgress[];
  courseId: string;
  lecturesAttempted: number;
  progressPercentage: number;
  lastWatchedLesson: string;
  lastWatchedModule: string;
  completedAt: Date;
  certificateUrl?: string;
}

export default function (app: Application): Model<CoursePreview> {
  const modelName = "CoursePreview";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const outlineItemProgress = new Schema({
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      enum: ["module", "lesson"],
      required: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    finishDate: {
      type: Date,
      default: null,
    },
    totalLessonsFinished: {
      type: Number,
      default: 0,
    },
    completed: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    lessons: [{
      type: Schema.Types.ObjectId,
      ref: "OutlineItemProgress",
    }],
    quizAttempts: [{
      score: { type: Number },
      passed: { type: Boolean },
      questions: [{
        id: { type: String },
        question: { type: String },
        type: { type: String, enum: ["multiple-choice", "multi-select", "true-false"] },
        options: [{ type: String }],
        correctAnswers: [{ type: String }]
      }],
      userAnswers: [{
        questionId: { type: String },
        selectedAnswers: [{ type: String }],
        isCorrect: { type: Boolean }
      }],
      submittedAt: { type: Date, default: () => new Date() }
    }],
    lastQuizScore: { type: Number },
    totalQuizAttempts: { type: Number, default: 0 },
  });

  const coursePreviewSchema = new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
      courseId: {
        type: Schema.Types.ObjectId,
        ref: "courses",
      },
      lecturesAttempted: {
        type: Number,
        default: 0,
      },
      progressPercentage: {
        type: Number,
        default: 0,
      },
      joinedDate: {
        type: Date,
        default: new Date(),
      },
      completedAt: {
        type: Date,
      },
      certificateUrl: {
        type: String,
      },
      progressHistory: [outlineItemProgress],
      lastWatchedLesson: {
        type: Schema.Types.ObjectId,
      },
      lastWatchedModule: {
        type: Schema.Types.ObjectId,
      },
      lastWatchedVideoTiming: {
        type: Number,
      },
    },
    { toJSON: { virtuals: true }, toObject: { virtuals: true } },
  );

  coursePreviewSchema.virtual("approvedCourse", {
    ref: "approvedCourses",
    localField: "courseId",
    foreignField: "mainCourse",
    justOne: true,
  });
  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, coursePreviewSchema);
}
