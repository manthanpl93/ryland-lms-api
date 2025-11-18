// Request type for checking course changes
export interface CheckCourseChangesRequest {
  courseId: string;
}

// Response type for course changes check
export interface CheckCourseChangesResponse {
  hasChanges: boolean;
  canPublish: boolean;
  message: string;
}

// Media Upload interface for publish changes
export interface MediaUpload {
  status: "pending" | "started" | "uploading" | "finished" | "error";
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

// Change Types for Course Publishing
export type CoursePublishChange = 
  | {
      type: "text";
      change: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }
  | {
      type: "media";
      change: string;
      field: string;
      oldValue: MediaUpload | null;
      newValue: MediaUpload | null;
    };

export type LessonPublishChange = 
  | {
      type: "text";
      change: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      moduleName: string;
      lessonName: string;
    }
  | {
      type: "media";
      change: string;
      field: string;
      oldValue: MediaUpload | null;
      newValue: MediaUpload | null;
      moduleName: string;
      lessonName: string;
    };

// Request Parameters for Publish Changes API
export interface IPublishChangesParams {
  courseId: string; // From URL parameter
}

// Response Types for Publish Changes API
export type IPublishChangesResponse = 
  | {
      coursePublished: true;
      hasChanges: true;
      changesByCategory: {
        details: CoursePublishChange[];
        lessons: LessonPublishChange[];
        certificate: CoursePublishChange[];
      };
    }
  | {
      coursePublished: true;
      hasChanges: false;
    }
  | {
      coursePublished: false;
      hasChanges: false;
    }; 