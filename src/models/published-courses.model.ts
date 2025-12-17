// published-courses-model.ts - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
import { Application } from "../declarations";
import { Model, Mongoose } from "mongoose";

interface Lesson {
  _id: string;
  category: "lesson";
  title: string;
  contentType: "media" | "text";
  type: "pdf" | "video" | "content" | "quiz" | "powerpoint";
  resource?: any;
  content?: string;
  videoProcessingData?: any;
  quizData?: {
    title: { type: string };
    description: { type: string };
    questions: [{
      id: { type: string };
      type: { type: string, enum: ["multiple-choice", "multi-select", "true-false"] };
      question: { type: string };
      options: [{ type: string }];
      correctAnswers: [{ type: string }];
      feedback: { type: string };
    }];
    settings: {
      randomizeQuestions: { type: boolean, default: false };
      allowRetakes: { type: boolean, default: true };
      passingPercentage: { type: number, default: 70, min: 0, max: 100 };
    };
  };
  metadata?: {
    description: string;
    duration: number;
    isPreviewable: boolean;
    requiredLesson: boolean;
  };
  scheduleEnabled?: boolean;
  scheduleDate?: Date;
  deadlineEnabled?: boolean;
  deadlineDate?: Date;
  deadlinePointsEnabled?: boolean;
  deadlinePoints?: number;
  quizRewards?: {
    badge: string;
    additionalPoints: number;
  };
}

interface Module {
  _id: string;
  category: "module";
  title: string;
  lessons: Lesson[];
}

type OutlineItem = Module | Lesson;

interface Courses {
  title: string;
  learnings: string[];
  audience: string[];
  imageUrl: string;
  outline: OutlineItem[] | [];
}

export default function (app: Application): Model<Courses> {
  const modelName = "publishedCourses";
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
      enum: ["module", "lesson"],
      required: true,
    },
    // For modules
    lessons: [lessonSchema],
    // For lessons
    contentType: {
      type: String,
      enum: ["media", "text"],
    },
    type: {
      type: String,
      enum: ["pdf", "video", "content", "quiz", "powerpoint"],
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
    resource: {
      type: Object,
    },
    content: {
      type: String,
    },
    videoProcessingData: {
      type: Object,
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

  const publishedCourseSchema = new Schema(
    {
      mainCourse: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "courses",
      },
      title: { type: String },
      category: { type: String },
      courseDescription: { type: String },
      difficultyLevel: { 
        type: String, 
        enum: ["Beginner", "Intermediate", "Advanced"], 
        required: false 
      },
      learnings: { type: [String] },
      courseImage: { type: Object },
      authors: { type: [Schema.Types.ObjectId], ref: "users" },
      owner: { type: Schema.Types.ObjectId, required: true, ref: "users" },
      outline: { type: [outlineItemSchema], default: [] },
      certificateDetails: { type: Map },
      accuracy: { type: String },
      status: { 
        type: String, 
        enum: ["draft", "review", "rejected", "approved"], 
        required: false 
      },
      deleted: { type: Boolean },
      last_status_changed_at: { type: Date },
      lastReleaseDate: { 
        type: Date, 
        required: false 
      },
      courseHash: { 
        type: String, 
        required: false
      },
      classId: {
        type: Schema.Types.ObjectId,
        ref: "classes",
        required: false
      }
    },
    {
      strict: false,
      timestamps: true,
    },
  );

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }
  return mongooseClient.model<any>(modelName, publishedCourseSchema);
}





