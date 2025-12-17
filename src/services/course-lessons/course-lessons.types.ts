/**
 * Type definitions for the course-lessons service
 */

export interface LessonAttemptData {
  courseId: string;
  lessonId: string;
  moduleId: string; // Required - no standalone lessons supported
  status: "started" | "completed";
  type?: "regular" | "quiz";
  userAnswers?: Record<string, string[]>; // For quiz validation
}

export interface ProgressResult {
  progressPercentage: number;
  lessonId: string;
  moduleId?: string;
  progressHistory?: any[];
  quiz?: {
    passed: boolean;
    score: number;
  };
}

export interface ProgressInfo {
  completed: boolean;
  startDate?: Date;
  finishDate?: Date;
  checkpoint?: any;
  canMarkCompleted?: boolean;
}

export interface CheckpointData {
  courseId: string;
  lessonId: string;
  moduleId: string;
  checkpoint: {
    // For PDF lessons
    currentPage?: number;
    totalPages?: number;
    highestPageVisited?: number;
    // For Video lessons
    currentTime?: number;
    duration?: number;
    furthestTimeReached?: number;
  };
}

export interface CheckpointResponse {
  success: boolean;
  lessonId: string;
  moduleId: string;
  checkpoint: any;
  canMarkCompleted: boolean;
  completionCriteria: any;
}

export interface CourseOutlineResponse {
  enrolled: boolean;
  courseId: string;
  progressPercentage: number;
  outline: any[];
  title: string;
  courseSubtitle?: string;
  courseDescription?: string;
  learnings?: string[];
  courseImage?: any;
  owner?: any;
  totalStudents?: number;
}

export interface QuizValidationResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

