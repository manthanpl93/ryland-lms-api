/**
 * Course Lessons Service
 *
 * This service handles:
 * 1. Auto-enrolling students when they access course content (creates student progress)
 * 2. Updating course lesson progress (module-based lessons only)
 * 3. Quiz validation with scoring and pass/fail logic
 * 4. Checkpoint tracking for PDF and Video lessons
 * 5. Course completion with certificate generation
 * 6. Progress percentage calculation
 *
 * Business Logic:
 * - Students are automatically enrolled when accessing a course (via student progress)
 * - Only module-based lessons are supported (no standalone lessons)
 * - Lessons can be started multiple times but completed only once
 * - PDF/Video lessons require checkpoint validation before completion
 * - Completed lessons update course progress
 * - Course completion at 100% triggers certificate generation and notifications
 */

import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";
import {
  LessonAttemptData,
  ProgressResult,
  ProgressInfo,
  CheckpointData,
  CheckpointResponse,
} from "./course-lessons.types";

import studentProgressModel from "../../models/student-progress.model";
import createPublishedCoursesModel from "../../models/published-courses.model";
import { sendNotificationForCourseCompletion } from "../../utils/utilities";
import { triggerNotifications } from "../../utils/notification-manager/action-gateway";
import { NotificationConstants } from "../../utils/constants";
import generateCertificate from "../../utils/certificate-generator";
import { generatePDF } from "../../utils/pdf-generator";
import { uploadFileToS3 } from "../../utils/utilities";
import usersModel from "../../models/users.model";
import categoriesModel from "../../models/categories.model";

export class CourseLessons extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  /**
   * Fetch quiz data (correct answers and settings) from the publishedCourses model
   * @param courseId - ID of the course
   * @param lessonId - ID of the lesson
   * @returns Quiz data including correct answers and passing percentage
   */
  private async fetchQuizData(
    courseId: string,
    lessonId: string
  ): Promise<{
    correctAnswers: Record<string, string[]>;
    passingPercentage: number;
  }> {
    const course = await createPublishedCoursesModel(this.app).findOne({
      mainCourse: courseId,
      "outline.lessons._id": lessonId,
    });

    if (!course) {
      throw new BadRequest("Course not found");
    }

    let lesson;
    // Find lesson within modules (no standalone lessons)
    for (const module of course.outline) {
      if (module.category === "module" && module.lessons) {
        lesson = module.lessons.find(
          (l: any) => l._id.toString() === lessonId
        );
        if (lesson) break;
      }
    }

    if (!lesson || lesson.category !== "lesson" || !lesson.quizData) {
      throw new BadRequest("Quiz data not found for the specified lesson.");
    }

    // Extract correct answers
    const correctAnswers = lesson.quizData.questions.reduce(
      (acc: Record<string, string[]>, question: any) => {
        acc[question.id] = question.correctAnswers;
        return acc;
      },
      {}
    );

    // Extract passing percentage, default to 70% if not set
    const passingPercentage = lesson.quizData.settings?.passingPercentage;
    const validPassingPercentage =
      typeof passingPercentage === "number" ? passingPercentage : 70;

    return {
      correctAnswers,
      passingPercentage: validPassingPercentage,
    };
  }

  /**
   * Handle quiz validation and scoring
   *
   * This method:
   * 1. Fetches quiz data (correct answers and settings)
   * 2. Validates user's answers against correct answers
   * 3. Calculates the score
   * 4. Determines if the user passed based on passing percentage
   * 5. Throws an error if the user failed
   *
   * @param data - Lesson attempt data containing quiz answers
   * @returns Quiz result with passed status and score
   * @throws BadRequest if quiz failed
   */
  private async handleQuizValidation(
    data: LessonAttemptData
  ): Promise<{ passed: boolean; score: number }> {
    // Fetch quiz data (correct answers and settings) in a single call
    const quizData = await this.fetchQuizData(data.courseId, data.lessonId);

    // Calculate quiz score
    const totalQuestions = Object.keys(quizData.correctAnswers).length;
    let correctAnswersCount = 0;

    // Validate each question's answers
    Object.keys(quizData.correctAnswers).forEach((questionId) => {
      const userAnswer = data.userAnswers?.[questionId] || [];
      const correctAnswer = quizData.correctAnswers[questionId];

      // Check if user's answer matches the correct answer
      const isQuestionCorrect =
        correctAnswer.every((answer: string) => userAnswer.includes(answer)) &&
        userAnswer.length === correctAnswer.length;

      if (isQuestionCorrect) {
        correctAnswersCount++;
      }
    });

    // Calculate score percentage
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswersCount / totalQuestions) * 100)
        : 0;

    // Determine if user passed based on passing percentage
    const passed = score >= quizData.passingPercentage;

    // Store quiz result
    const quizResult = { passed, score };

    // If user failed, throw error with quiz results
    if (!passed) {
      const error = new BadRequest(
        "Quiz attempt failed. Please review your answers and try again.",
        {
          quizResult: quizResult,
        }
      );
      throw error;
    }

    console.log("Quiz validation successful:", {
      totalQuestions,
      correctAnswersCount,
      score,
      passed,
      passingPercentage: quizData.passingPercentage,
    });

    return quizResult;
  }


  /**
   * Create a new lesson attempt
   *
   * Flow:
   * 1. Validate request payload (moduleId required)
   * 2. Handle quiz validation if applicable
   * 3. Validate completion criteria for regular lessons
   * 4. Update student progress
   * 5. Handle course completion if applicable
   *
   * @param data - Lesson attempt request data
   * @param params - Service parameters including user from auth
   * @returns ProgressResult with progress details and quiz results
   */
  async create(
    data: LessonAttemptData,
    params?: Params
  ): Promise<ProgressResult> {
    try {
      const userId = params?.user?._id;
      if (!userId) {
        throw new BadRequest("User authentication required");
      }

      // Validate request data
      this.validateLessonAttemptRequest(data);

      // Initialize quiz result variables
      let quizResult: { passed: boolean; score: number } | undefined;

      // Check if the lesson attempt is of type quiz
      if (data.type === "quiz") {
        quizResult = await this.handleQuizValidation(data);
        // If passed, mark as completed
        data.status = "completed";
      }

      // Validate completion criteria for regular lessons (PDF/Video)
      if (data.status === "completed" && data.type === "regular") {
        // Get student progress to check canMarkCompleted flag
        const studentProgress = await studentProgressModel(this.app)
          .findOne({
            courseId: data.courseId,
            userId: userId,
          })
          .lean();

        if (studentProgress && studentProgress.progressHistory) {
          const progressHistory: any[] = studentProgress.progressHistory;

          // Find module progress (all lessons are module-based)
          const moduleProgress: any = progressHistory.find(
            (progress: any) =>
              progress.moduleId?.toString() === data.moduleId &&
              progress.category === "module"
          );

          if (moduleProgress && moduleProgress.lessons) {
            const lessonProgress = moduleProgress.lessons.find(
              (lesson: any) => lesson.lessonId?.toString() === data.lessonId
            );

            // Check if lesson requires checkpoint completion
            if (lessonProgress && lessonProgress.checkpoint) {
              // Get lesson metadata to determine if it's PDF or Video
              const lessonMetadata = await this.getLessonMetadata(
                data.courseId,
                data.lessonId
              );
              const contentType = lessonMetadata.contentType;
              const resource = lessonMetadata.resource;

              const isPdfOrVideo =
                contentType === "media" &&
                (resource?.fileType?.includes("pdf") ||
                  resource?.fileType?.includes("video"));

              // For PDF/Video lessons, check canMarkCompleted flag
              if (isPdfOrVideo && !lessonProgress.canMarkCompleted) {
                throw new BadRequest(
                  "Please finish the full lesson before marking it as complete."
                );
              }
            }
          }
        }
      }

      // Update student progress
      const courseProgress = await this.updateStudentProgress(data, userId);

      // Handle course completion notifications
      if (courseProgress.progressPercentage === 100) {
        await this.handleCourseCompletion(data.courseId, userId);
      }

      const result: any = {
        progressPercentage: courseProgress.progressPercentage,
        lessonId: courseProgress.lessonId,
        moduleId: courseProgress.moduleId,
      };

      // Add quiz results if this was a quiz attempt
      if (quizResult) {
        result.quiz = quizResult;
      }

      return result;
    } catch (error) {
      console.error("Lesson attempt creation failed:", error);
      throw error;
    }
  }

  /**
   * Find course outline with student progress
   *
   * Flow:
   * 1. Validate courseId and userId
   * 2. Fetch course outline from published-courses model
   * 3. Check if user has student progress record
   * 4. If not enrolled: create student progress record
   * 5. Fetch user's progress and merge with outline
   * 6. Calculate total progress percentage
   * 7. Return structured response with enrollment status and full course access
   *
   * Note: All students are automatically enrolled when accessing course content
   *
   * @param params - Service parameters including courseId and user from auth
   * @returns Response with outline and progress information
   */
  async find(params?: Params): Promise<any> {
    try {
      const userId = params?.user?._id;

      const courseId = params?.query?.courseId;
      if (!courseId) {
        throw new BadRequest("Course ID is required");
      }

      // Fetch course outline from published courses
      const course = await createPublishedCoursesModel(this.app)
        .findOne({
          mainCourse: courseId,
        })
        .populate("owner", "_id name email profilePicture")
        .lean();

      if (!course) {
        throw new BadRequest("Course not found");
      }

      const courseOutline = course.outline || [];

      // Check if user has student progress by looking for student progress record
      let studentProgress = await studentProgressModel(this.app)
        .findOne({
          courseId: courseId,
          userId: userId,
        })
        .lean();

      // If not enrolled, create student progress record
      if (!studentProgress) {
        console.log(`Auto-enrolling user ${userId} in course ${courseId}`);

        // Create initial student progress record
        const newStudentProgress = await studentProgressModel(this.app).create({
          userId: userId,
          courseId: courseId,
          lecturesAttempted: 0,
          progressPercentage: 0,
          joinedDate: new Date(),
          progressHistory: [],
        });

        studentProgress = newStudentProgress.toObject
          ? newStudentProgress.toObject()
          : newStudentProgress;
      }

      // Ensure studentProgress exists at this point (TypeScript safety)
      if (!studentProgress) {
        throw new BadRequest("Failed to get or create student progress");
      }

      // Now user is enrolled, merge progress with outline (full access)
      const progressHistory = studentProgress.progressHistory || [];

      const outlineWithProgress = courseOutline.map((item: any) => {
        const progress = this.findProgressForItem(progressHistory, item);
        return {
          ...item,
          progress,
        };
      });

      // Use existing progress percentage from studentProgress
      const progressPercentage = studentProgress.progressPercentage || 0;

      const response: any = {
        enrolled: true,
        courseId: courseId,
        progressPercentage,
        outline: outlineWithProgress,
        title: course.title,
        courseSubtitle: (course as any).courseSubtitle,
        courseDescription: (course as any).courseDescription,
        learnings: course.learnings,
        courseImage: (course as any).courseImage,
        owner: (course as any).owner,
        totalStudents: (course as any).totalStudents || 0,
      };

      return response;
    } catch (error) {
      console.error("Course outline fetch failed:", error);
      throw error;
    }
  }

  /**
   * Save checkpoint data for PDF and Video lessons
   *
   * This endpoint is used to track user progress through lessons:
   * - PDF: Tracks current page, highest page visited, and total pages
   * - Video: Tracks current time, furthest time reached, and duration
   *
   * The checkpoint data is saved to progressHistory and used to determine
   * if the lesson can be marked as completed (canMarkCompleted flag).
   *
   * @param id - Lesson ID (from URL params)
   * @param data - Checkpoint data
   * @param params - Service parameters including user from auth
   * @returns CheckpointResponse with completion criteria
   */
  async patch(
    id: any,
    data: CheckpointData,
    params?: Params
  ): Promise<CheckpointResponse> {
    try {
      const userId = params?.user?._id;
      if (!userId) {
        throw new BadRequest("User authentication required");
      }

      if (!data.courseId || !data.lessonId || !data.checkpoint) {
        throw new BadRequest("Invalid checkpoint data");
      }

      if (!data.moduleId) {
        throw new BadRequest(
          "Module ID is required. This system only supports module-based lessons."
        );
      }

      return await this.saveCheckpoint(data, userId);
    } catch (error) {
      console.error("Checkpoint save failed:", error);
      throw error;
    }
  }

  /**
   * Update student progress based on lesson attempt
   *
   * This is the core logic that handles:
   * - Module-based lesson progress (no standalone lessons)
   * - Progress calculation and updates
   * - Course completion tracking
   *
   * @param request - Lesson attempt request
   * @param userId - User ID
   * @returns Updated course progress
   */
  private async updateStudentProgress(
    request: LessonAttemptData,
    userId: string
  ): Promise<ProgressResult> {
    // Find student progress for user and course
    let studentProgress = await studentProgressModel(this.app)
      .findOne({
        courseId: request.courseId,
        userId: userId,
      })
      .lean();

    if (!studentProgress) {
      console.log(
        "Student progress not found, creating new one for user:",
        userId,
        "course:",
        request.courseId
      );

      // Create a new student progress if it doesn't exist
      try {
        const newStudentProgress = await studentProgressModel(this.app).create(
          {
            userId: userId,
            courseId: request.courseId,
            lecturesAttempted: 0,
            progressPercentage: 0,
            joinedDate: new Date(),
            progressHistory: [],
          }
        );

        studentProgress = newStudentProgress.toObject();
        console.log("Created new student progress:", studentProgress._id);
      } catch (error) {
        console.error("Failed to create student progress:", error);
        throw new BadRequest("Failed to create student progress");
      }
    }

    // Ensure progressHistory exists and is an array
    if (
      !studentProgress.progressHistory ||
      !Array.isArray(studentProgress.progressHistory)
    ) {
      console.log(
        "Progress history not found or invalid, initializing empty array"
      );
      studentProgress.progressHistory = [];
    }

    // Get current completed lessons count
    const currentCompletedLessons = this.countCompletedItems(
      studentProgress.progressHistory || []
    );

    // Create a copy of progress history to avoid mutating the original
    const progressHistoryCopy = JSON.parse(
      JSON.stringify(studentProgress.progressHistory || [])
    );

    // Update progress using module-based logic
    const updatedProgress = await this.handleModuleLessonProgress(
      progressHistoryCopy,
      request,
      currentCompletedLessons
    );

    const progressPercentage = await this.calculateProgressPercentage(
      updatedProgress.lecturesAttempted,
      request.courseId
    );

    console.log("Progress calculation result:", {
      updatedLecturesAttempted: updatedProgress.lecturesAttempted,
      requestCourseId: request.courseId,
      progressPercentage,
    });

    // Check if course is completed
    const completedAt =
      progressPercentage === 100 ? new Date() : studentProgress.completedAt;

    // Handle certificate generation at 100%
    if (progressPercentage === 100 && !studentProgress.cleared) {
      const certificateUrl = await this.generateAndUploadCertificate(
        request.courseId,
        userId
      );

      // Update with certificate info
      await studentProgressModel(this.app).updateOne(
        { _id: studentProgress._id },
        {
          $set: {
            progressPercentage,
            lastWatchedLesson: request.lessonId,
            lastWatchedModule: request.moduleId,
            completedAt,
            cleared: true,
            certificateUrl,
            progressHistory: updatedProgress.progressHistory,
          },
        }
      );
    } else {
      // Regular update without certificate
      await studentProgressModel(this.app).updateOne(
        { _id: studentProgress._id },
        {
          $set: {
            progressPercentage,
            lastWatchedLesson: request.lessonId,
            lastWatchedModule: request.moduleId,
            completedAt,
            progressHistory: updatedProgress.progressHistory,
          },
        }
      );
    }

    return {
      progressPercentage,
      lessonId: request.lessonId,
      moduleId: request.moduleId,
    };
  }

  /**
   * Handle module-based lesson progress
   *
   * @param progressHistory - Current progress history
   * @param request - Lesson attempt request
   * @param currentLecturesAttempted - Current lectures attempted count
   * @returns Updated progress data
   */
  private async handleModuleLessonProgress(
    progressHistory: any[],
    request: LessonAttemptData,
    currentLecturesAttempted: number
  ): Promise<{ progressHistory: any[]; lecturesAttempted: number }> {
    // Find or create module progress
    let moduleProgress = progressHistory.find(
      (progress: any) =>
        progress.moduleId?.toString() === request.moduleId &&
        progress.category === "module"
    );

    if (!moduleProgress) {
      moduleProgress = {
        moduleId: request.moduleId,
        category: "module",
        startDate: new Date(),
        lessons: [],
        totalLessonsFinished: 0,
        completed: "no",
        lastAttempted: new Date(),
      };
      progressHistory.push(moduleProgress);

      console.log(
        "Created new module progress:",
        JSON.stringify(moduleProgress, null, 2)
      );
    }

    // Ensure lessons array exists
    if (!moduleProgress.lessons) {
      moduleProgress.lessons = [];
    }

    // Find or create lesson progress within module
    let lessonProgress = moduleProgress.lessons.find(
      (lesson: any) => lesson.lessonId?.toString() === request.lessonId
    );

    const isNewLesson = !lessonProgress;
    if (isNewLesson) {
      lessonProgress = {
        lessonId: request.lessonId,
        category: "lesson",
        startDate: request.status === "started" ? new Date() : null,
        completed: request.status === "completed" ? "yes" : "no",
        lastAttempted: new Date(),
        finishDate: request.status === "completed" ? new Date() : null,
      };
      moduleProgress.lessons.push(lessonProgress);

      console.log(
        "Created new lesson progress:",
        JSON.stringify(lessonProgress, null, 2)
      );

      if (request.status === "completed") {
        moduleProgress.totalLessonsFinished++;
        currentLecturesAttempted++;
      }
    } else {
      // Update existing lesson based on status
      if (request.status === "started") {
        if (!lessonProgress.startDate) {
          lessonProgress.startDate = new Date();
        }
        lessonProgress.lastAttempted = new Date();
      } else if (request.status === "completed") {
        if (lessonProgress.completed === "yes") {
          throw new BadRequest("Lesson already completed");
        }

        lessonProgress.completed = "yes";
        lessonProgress.finishDate = new Date();
        lessonProgress.lastAttempted = new Date();
        moduleProgress.totalLessonsFinished++;
        currentLecturesAttempted++;
      }
    }

    return {
      progressHistory,
      lecturesAttempted: currentLecturesAttempted,
    };
  }

  /**
   * Calculate progress percentage for course
   *
   * @param lecturesAttempted - Number of lectures attempted
   * @param courseId - Course ID
   * @returns Progress percentage (0-100)
   */
  private async calculateProgressPercentage(
    lecturesAttempted: number,
    courseId: string
  ): Promise<number> {
    let totalLessons = 0;

    // Find course by mainCourse (published courses reference main courses)
    const course = await createPublishedCoursesModel(this.app).findOne({
      mainCourse: courseId,
    });

    if (!course) {
      console.log(
        "calculateProgressPercentage: Course not found for courseId:",
        courseId
      );
      return 0;
    }

    const courseOutline = course?.outline ? course.outline : [];

    if (!Array.isArray(courseOutline) || courseOutline.length === 0) {
      console.log(
        "calculateProgressPercentage: Course outline is empty or invalid for courseId:",
        courseId
      );
      return 0;
    }

    // Count lessons in modules only (no standalone lessons)
    for (const outlineItem of courseOutline) {
      if (outlineItem.category === "module") {
        totalLessons = totalLessons + (outlineItem.lessons?.length || 0);
      }
    }

    console.log("Outline processing debug:", {
      courseId,
      totalLessons,
      outlineItems: courseOutline.map((item) => ({
        category: item.category,
        title: item.title,
        lessonsCount:
          item.category === "module" ? item.lessons?.length || 0 : undefined,
      })),
    });

    // Prevent division by zero and ensure valid percentage
    if (totalLessons === 0) {
      console.log(
        "calculateProgressPercentage: totalLessons is 0, returning 0"
      );
      return 0;
    }

    const percentage = Math.ceil((lecturesAttempted / totalLessons) * 100);
    const finalPercentage = Math.min(Math.max(percentage, 0), 100); // Ensure percentage is between 0-100

    console.log("calculateProgressPercentage:", {
      lecturesAttempted,
      totalLessons,
      percentage,
      finalPercentage,
    });

    return finalPercentage;
  }

  /**
   * Validate lesson attempt request
   *
   * @param request - Lesson attempt request
   * @throws BadRequest if validation fails
   */
  private validateLessonAttemptRequest(request: LessonAttemptData): void {
    if (!request.courseId) {
      throw new BadRequest("Course ID is required");
    }

    if (!request.lessonId) {
      throw new BadRequest("Lesson ID is required");
    }

    if (!request.moduleId) {
      throw new BadRequest(
        "Module ID is required. This system only supports module-based lessons."
      );
    }

    if (
      !request.status ||
      !["started", "completed"].includes(request.status)
    ) {
      throw new BadRequest("Status must be 'started' or 'completed'");
    }
  }

  /**
   * Handle course completion notifications
   *
   * @param courseId - Course ID
   * @param userId - User ID
   */
  private async handleCourseCompletion(
    courseId: string,
    userId: string
  ): Promise<void> {
    try {
      // Send course completion notification
      await sendNotificationForCourseCompletion(courseId, userId);

      // Trigger notifications
      triggerNotifications({
        notificationTypes: [
          NotificationConstants.STUDENT_NOTIFICATION_TYPES.COMPLETION,
          NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_COMPLETED,
        ],
        studentId: userId,
        courseId: courseId,
      });
    } catch (error) {
      console.error(
        "Failed to handle course completion notifications:",
        error
      );
      // Don't throw error as this is not critical to the main flow
    }
  }

  /**
   * Find progress information for a specific outline item
   *
   * @param progressHistory - User's progress history
   * @param outlineItem - Course outline item (module)
   * @returns ProgressInfo or undefined if no progress found
   */
  private findProgressForItem(
    progressHistory: any[],
    outlineItem: any
  ): ProgressInfo | undefined {
    if (outlineItem.category === "module") {
      // For modules, check if all lessons are completed
      const moduleProgress = progressHistory.find(
        (progress) =>
          progress.moduleId?.toString() === outlineItem._id?.toString() &&
          progress.category === "module"
      );

      if (moduleProgress) {
        const totalLessons = outlineItem.lessons?.length || 0;
        const completedLessons = moduleProgress.totalLessonsFinished || 0;
        const isCompleted =
          totalLessons > 0 && completedLessons === totalLessons;

        // Update the outlineItem.lessons with individual lesson progress
        if (outlineItem.lessons && moduleProgress.lessons) {
          outlineItem.lessons = outlineItem.lessons.map((lesson: any) => {
            const lessonProgress = moduleProgress.lessons.find(
              (lp: any) => lp.lessonId?.toString() === lesson._id?.toString()
            );

            return {
              ...lesson,
              progress: lessonProgress
                ? {
                  completed: lessonProgress.completed === "yes",
                  startDate: lessonProgress.startDate,
                  finishDate: lessonProgress.finishDate,
                  checkpoint: lessonProgress.checkpoint || undefined,
                  canMarkCompleted: lessonProgress.canMarkCompleted || false,
                }
                : undefined,
            };
          });
        }

        return {
          completed: isCompleted,
          startDate: moduleProgress.startDate,
          finishDate: isCompleted ? moduleProgress.finishDate : undefined,
        };
      }
    }

    return undefined;
  }

  /**
   * Count total completed items from progress history
   *
   * @param progressHistory - User's progress history
   * @returns Total count of completed items
   */
  private countCompletedItems(progressHistory: any[]): number {
    let completedCount = 0;

    for (const progress of progressHistory) {
      if (progress.category === "module") {
        // For modules, count completed lessons
        completedCount += progress.totalLessonsFinished || 0;
      }
    }

    return completedCount;
  }

  /**
   * Generate and upload certificate to S3
   *
   * @param courseId - Course ID
   * @param userId - User ID
   * @returns Certificate URL
   */
  private async generateAndUploadCertificate(
    courseId: string,
    userId: string
  ): Promise<string> {
    try {
      // Fetch user and course details
      const user = await usersModel(this.app).findById(userId).lean();
      const course: any = await createPublishedCoursesModel(this.app)
        .findOne({ mainCourse: courseId })
        .lean();

      if (!user || !course) {
        throw new Error("Invalid user or course data");
      }

      // Extract location from user details
      const location = user.location;

      // Fetch category details
      const category = await categoriesModel(this.app)
        .findById(location)
        .lean();

      // Prepare completion details
      const completionDetails = {
        date: new Date().toISOString(),
        firstName: user.name ?? "",
        lastName: user.lastName ?? "",
        courseName: course?.certificateDetails?.title ?? course?.title,
        instructorName: course?.certificateDetails?.instructorName ?? "",
        courseDetails: course?.certificateDetails?.courseDetails ?? "",
        courseDuration: course?.certificateDetails?.courseDuration ?? "",
        designationTitle: course?.certificateDetails?.designationTitle ?? "",
        designationSubTitle:
          course?.certificateDetails?.designationSubTitle ?? "",
        leftLogo: category?.certificateLogo?.objectUrl,
        centerLogo:
          category?.certificateIcon?.objectUrl ||
          category?.brandingLogo?.objectUrl,
        courseTitle: course?.title,
      };

      // Generate certificate
      const { absolutePath } = await generateCertificate(completionDetails);
      const { absolutePath: pdfAbsolutePath }: any = await generatePDF(
        absolutePath
      );

      // Upload to S3
      const certificateUrl = await uploadFileToS3({
        filePath: pdfAbsolutePath,
        destS3Path: `certificates/${courseId}/${userId}.pdf`,
      });

      return certificateUrl;
    } catch (error) {
      console.error("Failed to generate and upload certificate:", error);
      // Return empty string if certificate generation fails
      return "";
    }
  }

  /**
   * Get lesson metadata including type and content information
   *
   * @param courseId - ID of the course
   * @param lessonId - ID of the lesson
   * @returns Lesson metadata with contentType and resource info
   */
  private async getLessonMetadata(
    courseId: string,
    lessonId: string
  ): Promise<any> {
    const course = await createPublishedCoursesModel(this.app)
      .findOne({
        mainCourse: courseId,
        "outline.lessons._id": lessonId,
      })
      .lean();

    if (!course) {
      throw new BadRequest("Course not found");
    }

    // Find lesson within modules (no standalone lessons)
    let lesson;
    for (const module of course.outline) {
      if (module.category === "module" && module.lessons) {
        lesson = module.lessons.find(
          (l: any) => l._id.toString() === lessonId
        );
        if (lesson) break;
      }
    }

    if (!lesson) {
      throw new BadRequest("Lesson not found");
    }

    return lesson;
  }

  /**
   * Calculate whether a lesson can be marked as completed based on checkpoint data
   *
   * @param checkpoint - Checkpoint data
   * @param lessonMetadata - Lesson metadata
   * @returns Whether the lesson can be marked as completed
   */
  private calculateCanMarkCompleted(
    checkpoint: any,
    lessonMetadata: any
  ): boolean {
    // Only PDF and Video lessons require checkpoint validation
    const contentType = lessonMetadata.contentType;
    const resource = lessonMetadata.resource;

    // Determine if it's PDF or Video
    const isPDF = contentType === "media" && resource?.fileType?.includes("pdf");
    const isVideo =
      contentType === "media" && resource?.fileType?.includes("video");

    if (isPDF && checkpoint.totalPages && checkpoint.highestPageVisited) {
      // PDF: Must visit last page
      return checkpoint.highestPageVisited >= checkpoint.totalPages;
    } else if (isVideo && checkpoint.duration && checkpoint.furthestTimeReached) {
      // Video: Must watch at least 99% (to account for rounding)
      const requiredTime = checkpoint.duration * 0.99;
      return checkpoint.furthestTimeReached >= requiredTime;
    }

    // For other lesson types or incomplete checkpoint data, return false
    return false;
  }

  /**
   * Build detailed completion criteria response
   *
   * @param checkpoint - Checkpoint data
   * @param lessonMetadata - Lesson metadata
   * @param canMarkCompleted - Whether lesson can be marked completed
   * @returns Completion criteria object
   */
  private buildCompletionCriteria(
    checkpoint: any,
    lessonMetadata: any,
    canMarkCompleted: boolean
  ): any {
    const contentType = lessonMetadata.contentType;
    const resource = lessonMetadata.resource;

    const isPDF = contentType === "media" && resource?.fileType?.includes("pdf");
    const isVideo =
      contentType === "media" && resource?.fileType?.includes("video");

    if (isPDF && checkpoint.totalPages) {
      const currentPage = checkpoint.currentPage || 0;
      const totalPages = checkpoint.totalPages;
      const highestPageVisited = checkpoint.highestPageVisited || 0;
      const percentageComplete = (highestPageVisited / totalPages) * 100;

      return {
        type: "pdf",
        currentPage,
        totalPages,
        highestPageVisited,
        requiredPage: totalPages,
        percentageComplete: Math.round(percentageComplete),
        isComplete: canMarkCompleted,
        message: canMarkCompleted
          ? "You have visited all pages. You can now mark this lesson as complete."
          : `Visit all pages to complete this lesson. Progress: ${highestPageVisited}/${totalPages} pages`,
      };
    } else if (isVideo && checkpoint.duration) {
      const currentTime = checkpoint.currentTime || 0;
      const duration = checkpoint.duration;
      const furthestTimeReached = checkpoint.furthestTimeReached || 0;
      const requiredTime = duration * 0.99;
      const percentageComplete = (furthestTimeReached / duration) * 100;

      return {
        type: "video",
        currentTime,
        duration,
        furthestTimeReached,
        requiredTime,
        percentageComplete: Math.round(percentageComplete),
        isComplete: canMarkCompleted,
        message: canMarkCompleted
          ? "You have watched the entire video. You can now mark this lesson as complete."
          : `Watch the entire video to complete this lesson. Progress: ${Math.round(
            percentageComplete
          )}%`,
      };
    }

    return null;
  }

  /**
   * Save checkpoint data and update canMarkCompleted flag
   *
   * @param request - Checkpoint data
   * @param userId - User ID
   * @returns Checkpoint response with completion criteria
   */
  private async saveCheckpoint(
    request: CheckpointData,
    userId: string
  ): Promise<CheckpointResponse> {
    // Find student progress
    let studentProgress = await studentProgressModel(this.app)
      .findOne({
        courseId: request.courseId,
        userId: userId,
      })
      .lean();

    // Create student progress if it doesn't exist
    if (!studentProgress) {
      const newStudentProgress = await studentProgressModel(this.app).create({
        userId: userId,
        courseId: request.courseId,
        lecturesAttempted: 0,
        progressPercentage: 0,
        joinedDate: new Date(),
        progressHistory: [],
      });
      studentProgress = newStudentProgress.toObject();
    }

    const progressHistory: any[] = studentProgress.progressHistory || [];

    // Get lesson metadata to determine type
    const lessonMetadata = await this.getLessonMetadata(
      request.courseId,
      request.lessonId
    );

    // Handle module-based lesson
    let moduleProgress: any = progressHistory.find(
      (progress: any) =>
        progress.moduleId?.toString() === request.moduleId &&
        progress.category === "module"
    );

    if (!moduleProgress) {
      moduleProgress = {
        moduleId: request.moduleId,
        category: "module",
        startDate: new Date(),
        lessons: [],
        totalLessonsFinished: 0,
        completed: "no",
        lastAttempted: new Date(),
      };
      progressHistory.push(moduleProgress);
    }

    if (!moduleProgress.lessons) {
      moduleProgress.lessons = [];
    }

    let lessonProgress = moduleProgress.lessons.find(
      (lesson: any) => lesson.lessonId?.toString() === request.lessonId
    );

    if (!lessonProgress) {
      lessonProgress = {
        lessonId: request.lessonId,
        category: "lesson",
        startDate: new Date(),
        completed: "no",
        lastAttempted: new Date(),
        checkpoint: {},
        canMarkCompleted: false,
      };
      moduleProgress.lessons.push(lessonProgress);
    }

    // Update checkpoint data
    lessonProgress.checkpoint = {
      ...lessonProgress.checkpoint,
      ...request.checkpoint,
      lastUpdated: new Date(),
    };

    // Calculate canMarkCompleted
    const canMarkCompleted = this.calculateCanMarkCompleted(
      lessonProgress.checkpoint,
      lessonMetadata
    );
    lessonProgress.canMarkCompleted = canMarkCompleted;

    lessonProgress.lastAttempted = new Date();

    // Save to database
    const updateResult = await studentProgressModel(this.app).updateOne(
      { courseId: request.courseId, userId },
      { $set: { progressHistory } }
    );

    if (updateResult.matchedCount === 0) {
      throw new BadRequest("Student progress not found");
    }

    return {
      success: true,
      lessonId: request.lessonId,
      moduleId: request.moduleId,
      checkpoint: lessonProgress.checkpoint,
      canMarkCompleted,
      completionCriteria: this.buildCompletionCriteria(
        lessonProgress.checkpoint,
        lessonMetadata,
        canMarkCompleted
      ),
    };
  }
}

