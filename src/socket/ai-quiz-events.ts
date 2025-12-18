import { addAIQuizJob, cancelAIQuizJob } from "../processors/ai-quiz-processor";
import { getQueueManager } from "../utils/queue-manager";
import { v4 as uuidv4 } from "uuid";
import createAIQuizSessionsModel from "../models/ai-quiz-sessions.model";
import {
  AI_QUIZ_SOCKET_EVENTS,
  AI_QUIZ_STATUS,
  AI_QUIZ_ERROR_CODES,
  AI_QUIZ_STEPS,
  AI_QUIZ_LIMITS,
  SUPPORTED_FILE_TYPES
} from "../utils/consts/ai-quiz-constants";

function registerAIQuizEvents(socket: any, app: any) {
  const queueManager = getQueueManager(app);
  const aiQuizSessionsModel = createAIQuizSessionsModel(app);

  // Helper Functions
  const validateGenerateRequest = (data: any) => {
    const {  files, settings } = data;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return { error: "At least one file is required", code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
    }
    if (files.length > AI_QUIZ_LIMITS.MAX_FILES_PER_REQUEST) {
      return { error: `Maximum ${AI_QUIZ_LIMITS.MAX_FILES_PER_REQUEST} files allowed`, code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
    }
    if (settings) {
      if (settings.questionCount && (settings.questionCount < AI_QUIZ_LIMITS.MIN_QUESTIONS_PER_REQUEST || settings.questionCount > AI_QUIZ_LIMITS.MAX_QUESTIONS_PER_REQUEST)) {
        return { error: `Question count must be between ${AI_QUIZ_LIMITS.MIN_QUESTIONS_PER_REQUEST} and ${AI_QUIZ_LIMITS.MAX_QUESTIONS_PER_REQUEST}`, code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
      }
    }
    return null;
  };

  const validateFiles = async (files: any[]): Promise<any[]> => {
    const validatedFiles = [];
    
    for (const file of files) {
      try {
        // Validate required properties
        if (!file.id || !file.fileName || !file.fileType || !file.s3Url || !file.fileSize) {
          continue;
        }
        
        const fileExtension = file.fileType.toLowerCase();
        
        if (!SUPPORTED_FILE_TYPES.includes(fileExtension as any)) {
          continue;
        }
        if (file.fileSize > AI_QUIZ_LIMITS.MAX_FILE_SIZE) {
          continue;
        }
        
        const validatedFile = {
          id: file.id,
          fileName: file.fileName,
          fileType: file.fileType,
          s3Url: file.s3Url,
          size: file.fileSize
        };
        validatedFiles.push(validatedFile);
      } catch (error) {
        // Silent error handling
      }
    }
    return validatedFiles;
  };

  // AI Quiz Generation
  socket.on(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GENERATE, async function (data: any) {
    try {
      const { courseId, files, settings } = data;
      const user = socket.handshake.query.user;
      const userId = user._id;
      const sessionId = uuidv4();

      // Validate input
      const validationError = validateGenerateRequest(data);
      if (validationError) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, validationError);
        return;
      }

      // Check rate limits
      const canProcess = await queueManager.canProcessRequest(userId);
      if (!canProcess) {
        const retryAfter = await queueManager.getRetryAfter(userId);
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
          error: "Rate limit exceeded. Please try again later.",
          code: AI_QUIZ_ERROR_CODES.RATE_LIMIT_EXCEEDED,
          retryAfter: retryAfter
        });
        return;
      }

      // Validate files from payload
      const validatedFiles = await validateFiles(files);
      if (!validatedFiles.length) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
          error: "No valid files found in payload",
          code: AI_QUIZ_ERROR_CODES.FILES_NOT_FOUND
        });
        return;
      }

      // Create session record
      const sessionData = {
        userId,
        courseId,
        sessionId,
        status: AI_QUIZ_STATUS.PENDING,
        files: validatedFiles.map((f: any) => ({
          fileName: f.fileName,
          fileType: f.fileType,
          s3Url: f.s3Url,
          fileSize: f.size
        })),
        settings: {
          questionCount: Math.min(settings.questionCount || 10, AI_QUIZ_LIMITS.MAX_QUESTIONS_PER_REQUEST),
          questionTypes: settings.questionTypes || ["multiple-choice"],
          difficulty: settings.difficulty || "medium",
          language: settings.language || "en"
        },
        progress: {
          filesProcessed: 0,
          totalFiles: validatedFiles.length,
          questionsGenerated: 0,
          currentStep: AI_QUIZ_STEPS.QUEUED,
          percentage: 0
        }
      };
      const session = await aiQuizSessionsModel.create(sessionData);

      // Add to processing queue
      const jobData = {
        sessionId,
        userId,
        courseId,
        files: validatedFiles,
        settings: session.settings,
        socketId: socket.id
      };
      await addAIQuizJob(jobData);

      // Get queue position and estimated time
      const queuePosition = await queueManager.getQueuePosition(sessionId);
      const estimatedWaitTime = queuePosition * 120; // 2 minutes per job estimate

      // Update session with queue info
      await aiQuizSessionsModel.findOneAndUpdate(
        { sessionId },
        {
          queuePosition,
          "progress.estimatedCompletion": new Date(Date.now() + estimatedWaitTime * 1000)
        }
      );

      // SERVER TO CLIENT: Emit success response
      const responseData = {
        sessionId,
        status: AI_QUIZ_STATUS.PROCESSING,
        message: "AI quiz generation started successfully",
        queuePosition,
        estimatedWaitTime,
        totalFiles: validatedFiles.length,
        settings: session.settings
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.STARTED, responseData);

    } catch (error) {
      const errMsg = typeof error === "object" && error && "message" in error ? (error as any).message : String(error);
      const errorResponse = {
        error: errMsg || "Failed to start AI quiz generation",
        code: AI_QUIZ_ERROR_CODES.GENERATION_ERROR
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, errorResponse);
    }
  });

  // Get AI Quiz Status
  socket.on(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GET_STATUS, async function (data: any) {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
          error: "Session ID is required",
          code: AI_QUIZ_ERROR_CODES.INVALID_INPUT
        });
        return;
      }

      const session = await aiQuizSessionsModel.findOne({ sessionId });

      if (!session) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
          error: "Session not found",
          code: AI_QUIZ_ERROR_CODES.SESSION_NOT_FOUND
        });
        return;
      }

      // Calculate time elapsed and remaining
      const timeElapsed = session.startedAt ? Date.now() - session.startedAt.getTime() : 0;
      const estimatedTotal = session.progress.estimatedCompletion ?
        session.progress.estimatedCompletion.getTime() - session.createdAt.getTime() : 0;
      const timeRemaining = Math.max(0, estimatedTotal - timeElapsed);

      // SERVER TO CLIENT: Send status response
      const statusResponse = {
        sessionId,
        status: session.status,
        progress: {
          ...session.progress,
          timeElapsed: Math.round(timeElapsed / 1000),
          timeRemaining: Math.round(timeRemaining / 1000)
        },
        error: session.error,
        files: session.files.map((f: any) => ({
          fileName: f.fileName,
          fileType: f.fileType,
          processed: !!f.processedAt,
          extractedTextLength: f.extractedTextLength,
          chunksCount: f.chunksCount
        })),
        queuePosition: session.queuePosition
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.STATUS, statusResponse);

    } catch (error) {
      const errorResponse = {
        error: "Failed to get session status",
        code: AI_QUIZ_ERROR_CODES.STATUS_ERROR
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, errorResponse);
    }
  });

  // Cancel AI Quiz Generation
  socket.on(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.CANCEL, async function (data: any) {
    try {
      const { sessionId } = data;
      const user = socket.handshake.query.user;
      const userId = user._id;

      if (!sessionId) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
          error: "Session ID is required",
          code: AI_QUIZ_ERROR_CODES.INVALID_INPUT
        });
        return;
      }

      // Verify session belongs to user
      const session = await aiQuizSessionsModel.findOne({ 
        sessionId, 
        userId 
      });

      if (!session) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, { 
          error: "Session not found or access denied",
          code: AI_QUIZ_ERROR_CODES.SESSION_NOT_FOUND
        });
        return;
      }

      // Check if session can be cancelled
      if (session.status === AI_QUIZ_STATUS.COMPLETED || session.status === AI_QUIZ_STATUS.CANCELLED) {
        socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, { 
          error: `Cannot cancel session with status: ${session.status}`,
          code: AI_QUIZ_ERROR_CODES.INVALID_SESSION
        });
        return;
      }

      // Cancel job in queue
      await cancelAIQuizJob(sessionId);
      
      // Update session status
      await aiQuizSessionsModel.findOneAndUpdate(
        { sessionId },
        { 
          status: AI_QUIZ_STATUS.CANCELLED,
          "progress.currentStep": AI_QUIZ_STEPS.CANCELLED,
          "progress.percentage": 0,
          completedAt: new Date()
        }
      );

      // SERVER TO CLIENT: Send cancellation confirmation
      const cancelResponse = {
        sessionId,
        message: "Quiz generation cancelled successfully",
        timestamp: new Date().toISOString()
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.CANCELLED, cancelResponse);

    } catch (error) {
      const errorResponse = {
        error: "Failed to cancel generation",
        code: AI_QUIZ_ERROR_CODES.CANCEL_ERROR
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, errorResponse);
    }
  });

  // Get Queue Status
  socket.on(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GET_QUEUE_STATUS, async function () {
    try {
      const status = await queueManager.getQueueStatus();
      const user = socket.handshake.query.user;
      const userId = user._id;
      
      const userSessions = await aiQuizSessionsModel.find({
        userId,
        status: { $in: [AI_QUIZ_STATUS.PENDING, AI_QUIZ_STATUS.PROCESSING] }
      }).select("sessionId status progress queuePosition createdAt");
      
      const queueResponse = {
        global: status,
        userSessions: userSessions.map((session: any) => ({
          sessionId: session.sessionId,
          status: session.status,
          progress: session.progress,
          queuePosition: session.queuePosition,
          createdAt: session.createdAt
        })),
        canCreateNew: await queueManager.canProcessRequest(userId),
        rateLimitInfo: await queueManager.getRateLimitInfo(userId)
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.QUEUE_STATUS, queueResponse);
    } catch (error) {
      const errorResponse = {
        error: "Failed to get queue status",
        code: AI_QUIZ_ERROR_CODES.QUEUE_STATUS_ERROR
      };
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, errorResponse);
    }
  });
}

export { registerAIQuizEvents }; 