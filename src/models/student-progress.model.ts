// student-progress.model.ts - A mongoose model for tracking student course progress
//
// This model tracks lesson-level progress and course enrollment
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

export interface CheckpointData {
  currentPage?: number;
  totalPages?: number;
  highestPageVisited?: number;
  currentTime?: number;
  duration?: number;
  furthestTimeReached?: number;
  lastUpdated?: Date;
}

export interface LessonProgress {
  lessonId: any;
  category: "lesson";
  startDate?: Date;
  finishDate?: Date;
  completed: "yes" | "no";
  lastAttempted: Date;
  checkpoint?: CheckpointData;
  canMarkCompleted?: boolean;
}

export interface ModuleProgress {
  moduleId: any;
  category: "module";
  startDate?: Date;
  lastAttempted: Date;
  totalLessonsFinished: number;
  completed: "yes" | "no";
  lessons: LessonProgress[];
}

export interface StudentProgress {
  userId: any;
  courseId: any;
  lecturesAttempted: number;
  progressPercentage: number;
  joinedDate: Date;
  completedAt?: Date;
  certificateUrl?: string;
  cleared?: boolean;
  lastWatchedLesson?: any;
  lastWatchedModule?: any;
  progressHistory: ModuleProgress[];
}

export default function (app: Application): Model<StudentProgress> {
  const modelName = "studentProgress";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  // Checkpoint schema for PDF/Video tracking
  const checkpointSchema = new Schema(
    {
      // PDF fields
      currentPage: { type: Number },
      totalPages: { type: Number },
      highestPageVisited: { type: Number },
      // Video fields
      currentTime: { type: Number },
      duration: { type: Number },
      furthestTimeReached: { type: Number },
      // Common
      lastUpdated: { type: Date, default: () => new Date() },
    },
    { _id: false }
  );

  // Lesson progress schema (nested within modules)
  const lessonProgressSchema = new Schema(
    {
      lessonId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      category: {
        type: String,
        enum: ["lesson"],
        default: "lesson",
      },
      startDate: {
        type: Date,
        default: null,
      },
      finishDate: {
        type: Date,
        default: null,
      },
      completed: {
        type: String,
        enum: ["yes", "no"],
        default: "no",
      },
      lastAttempted: {
        type: Date,
        default: () => new Date(),
      },
      checkpoint: {
        type: checkpointSchema,
        default: undefined,
      },
      canMarkCompleted: {
        type: Boolean,
        default: false,
      },
    },
    { _id: false }
  );

  // Module progress schema
  const moduleProgressSchema = new Schema(
    {
      moduleId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      category: {
        type: String,
        enum: ["module"],
        default: "module",
      },
      startDate: {
        type: Date,
        default: null,
      },
      lastAttempted: {
        type: Date,
        default: () => new Date(),
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
      lessons: [lessonProgressSchema],
    },
    { _id: false }
  );

  // Main student progress schema
  const studentProgressSchema = new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
      },
      courseId: {
        type: Schema.Types.ObjectId,
        ref: "courses",
        required: true,
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
        default: () => new Date(),
      },
      completedAt: {
        type: Date,
        default: null,
      },
      certificateUrl: {
        type: String,
      },
      cleared: {
        type: Boolean,
        default: false,
      },
      lastWatchedLesson: {
        type: Schema.Types.ObjectId,
      },
      lastWatchedModule: {
        type: Schema.Types.ObjectId,
      },
      progressHistory: [moduleProgressSchema],
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes for efficient queries
  studentProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
  studentProgressSchema.index({ userId: 1 });
  studentProgressSchema.index({ courseId: 1 });
  studentProgressSchema.index({ progressPercentage: 1 });
  studentProgressSchema.index({ completedAt: 1 });

  // This is necessary to avoid model compilation errors in watch mode
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<any>(modelName, studentProgressSchema);
}

