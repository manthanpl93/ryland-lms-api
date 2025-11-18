// courses-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

// Media Upload Types
export interface MediaUpload {
  status: "pending" | "started" | "uploading" | "finished" | "error";
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

// Certificate Details Types
export interface CertificateDetails {
  certificateTitle: string;
  certificateSubtitle: string;
  courseName: string;
  showCompletionDate: boolean;
  showCertificateNumber: boolean;
  enableNotification: boolean;
  emailSubject: string;
  emailBody: string;
  logo: MediaUpload;
}

// Quiz Types
export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "multi-select" | "true-false";
  question: string;
  options: string[];
  correctAnswers: string[];
  feedback: string;
}

export interface QuizSettings {
  randomizeQuestions: boolean;
  allowRetakes: boolean;
  passingPercentage: number;
}

export interface QuizData {
  title: string;
  description: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
}

export interface LessonMetadata {
  description: string;
  duration: number;
  isPreviewable: boolean;
  requiredLesson: boolean;
}

export interface Lesson {
  _id: string;
  category: "lesson";
  title: string;
  contentType: "media" | "text";
  type: "pdf" | "video" | "content" | "quiz";
  resource?: MediaUpload;
  content?: string;
  videoProcessingData?: any;
  quizData?: QuizData;
  metadata?: LessonMetadata;
  scheduleEnabled?: boolean;
  scheduleDate?: Date;
  deadlineEnabled?: boolean;
  deadlineDate?: Date;
  deadlinePointsEnabled?: boolean;
  deadlinePoints?: number;
  quizRewards?: {
    badge?: "none" | "quiz-master" | "outstanding-learner";
    additionalPoints?: number;
  };
}

export interface Module {
  _id: string;
  category: "module";
  title: string;
  lessons: Lesson[];
}

export interface Courses {
  _id?: any;
  title: string;
  courseDescription?: string;
  difficultyLevel?: "Beginner" | "Intermediate" | "Advanced";
  learnings: string[];
  courseImage?: MediaUpload;
  outline: Module[];
  certificateDetails?: CertificateDetails;
  accuracy?: string;
  status?: "draft" | "review" | "rejected" | "approved";
  deleted?: boolean;
  last_status_changed_at?: Date;
  courseHash?: string;
  lastReleaseDate?: Date;
  classId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function (app: Application): Model<Courses> {
  const modelName = "courses";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const lessonSchema = new Schema({
    title: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      enum: ["media", "text"],
      required: true,
    },
    type: {
      type: String,
      enum: ["pdf", "video", "content", "quiz", "powerpoint"],
      required: true,
    },
    resource: {
      type: Object,
    },
    content: {
      type: String,
    },
    videoProcessingData: {
      type: Object,
    },
    quizData: {
      title: { type: String },
      description: { type: String },
      questions: [{
        id: { type: String },
        type: { type: String, enum: ["multiple-choice", "multi-select", "true-false"] },
        question: { type: String },
        options: [{ type: String }],
        correctAnswers: [{ type: String }],
        feedback: { type: String }
      }],
      settings: {
        randomizeQuestions: { type: Boolean, default: false },
        allowRetakes: { type: Boolean, default: true },
        passingPercentage: { type: Number, default: 70, min: 0, max: 100 }
      }
    },
    category: {
      type: String,
      enum: ["lesson"],
      default: "lesson",
    },
    metadata: {
      description: { type: String, default: "" },
      duration: { type: Number, default: 0 },
      isPreviewable: { type: Boolean, default: true },
      requiredLesson: { type: Boolean, default: false }
    },
    scheduleEnabled: { type: Boolean, default: false },
    scheduleDate: { type: Date },
    deadlineEnabled: { type: Boolean, default: false },
    deadlineDate: { type: Date },
    deadlinePointsEnabled: { type: Boolean, default: false },
    deadlinePoints: { type: Number, min: 0 },
    quizRewards: {
      badge: { type: String, enum: ["none", "quiz-master", "outstanding-learner"] },
      additionalPoints: { type: Number, min: 0 }
    },
  });

  const outlineItemSchema = new Schema({
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["module"],
      required: true,
      default: "module",
    },
    // Module fields
    lessons: [lessonSchema],
  });



  const coursesSchema = new Schema(
    {
      title: { type: String, required: false },
      difficultyLevel: { 
        type: String, 
        enum: ["Beginner", "Intermediate", "Advanced"], 
        required: false 
      },
      learnings: { type: [String], required: false },
      courseImage: {
        status: { type: String, enum: ["pending", "started", "uploading", "finished", "error"] },
        objectUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        fileType: { type: String, required: true },
        fileSize: { type: Number, required: true }
      },
      accuracy: { type: String, default: 80 },
      status: {
        type: String,
        enum: ["draft", "review", "rejected", "approved"],
      },
      outline: { type: [outlineItemSchema], default: [] },
      deleted: { type: Boolean },
      last_status_changed_at: { type: Date },
      certificateDetails: {
        certificateTitle: { type: String },
        certificateSubtitle: { type: String },
        courseName: { type: String },
        showCompletionDate: { type: Boolean, default: true },
        showCertificateNumber: { type: Boolean, default: true },
        enableNotification: { type: Boolean, default: false },
        emailSubject: { type: String },
        emailBody: { type: String },
        logo: {
          status: { type: String, enum: ["pending", "started", "uploading", "finished", "error"] },
          objectUrl: { type: String },
          fileName: { type: String },
          fileType: { type: String },
          fileSize: { type: Number }
        }
      },
      // NEW FIELDS for publish feature
      courseHash: { 
        type: String, 
        required: false
      },
      lastReleaseDate: { 
        type: Date, 
        required: false 
      },
      // Class reference - one course belongs to one class
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: false
      }
    },
    {
      strict: false,
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );
  
  // Index for class queries
  coursesSchema.index({ classId: 1 });
  
  coursesSchema.virtual("enrolledCourses", {
    ref: "CoursePreview",
    localField: "_id",
    foreignField: "courseId",
  });
  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, coursesSchema);
}
