import crypto from "crypto";

// Interface for course content that should be included in hash generation
export interface CourseContentForHash {
  title: string;
  learnings: string[];
  courseImage?: {
    status: string;
    objectUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
  outline: any[]; // Using any[] for flexibility with the complex outline structure
  certificateDetails?: {
    certificateTitle?: string;
    certificateSubtitle?: string;
    courseName?: string;
    showCompletionDate?: boolean;
    showCertificateNumber?: boolean;
    enableNotification?: boolean;
    emailSubject?: string;
    emailBody?: string;
    logo?: {
      status?: string;
      objectUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };
  };
}

/**
 * Generates a SHA-256 hash for course content to detect changes
 * @param course - Course content object
 * @returns SHA-256 hash string
 */
export function generateContentHash(course: CourseContentForHash): string {
  const content = JSON.stringify({
    title: course.title,
    learnings: course.learnings,
    courseImage: course.courseImage,
    outline: course.outline,
    certificateDetails: course.certificateDetails,
  });
  
  return crypto.createHash("sha256").update(content).digest("hex");
} 