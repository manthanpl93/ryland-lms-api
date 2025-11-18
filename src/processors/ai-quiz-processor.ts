import { Queue, Worker, Job } from "bullmq";
import { connection } from "./index";
import { getQueueManager } from "../utils/queue-manager";
import { getSocketById } from "../socket/sockets";
import createAIQuizSessionsModel from "../models/ai-quiz-sessions.model";
import {
  AI_QUIZ_SOCKET_EVENTS,
  AI_QUIZ_STATUS,
  AI_QUIZ_STEPS,
  AI_QUIZ_ERROR_CODES,
  AI_QUIZ_LIMITS,
} from "../utils/consts/ai-quiz-constants";
import { v4 as uuidv4 } from "uuid";

export const aiQuizQueue = new Queue("aiQuizProcessing", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    delay: 0,
  },
});

// Placeholders for exported functions
let addAIQuizJob: (jobData: any) => Promise<any> = async () => {
  throw new Error("AI Quiz Processor not initialized");
};
let cancelAIQuizJob: (sessionId: string) => Promise<any> = async () => {
  throw new Error("AI Quiz Processor not initialized");
};

export { addAIQuizJob, cancelAIQuizJob };

export function initializeAIQuizProcessor(app: any) {
  console.log("🚀 Initializing AI Quiz Processor...");

  const queueManager = getQueueManager(app);
  const aiQuizSessionsModel = createAIQuizSessionsModel(app);

  // Worker with limited concurrency and proper error handling
  const aiQuizWorker = new Worker(
    "aiQuizProcessing",
    async (job: Job) => {
      const { sessionId, files, settings, socketId } = job.data;

      console.log(`📝 Starting AI Quiz job for session: ${sessionId}`);
      console.log("📊 Job details:", {
        sessionId,
        filesCount: files.length,
        settings: {
          questionCount: settings.questionCount,
          chunkSize: settings.chunkSize,
        },
        socketId,
      });

      try {
        // Check if job was cancelled before starting
        if (await queueManager.isJobCancelled(sessionId)) {
          console.log(`❌ Job cancelled for session: ${sessionId}`);
          await handleJobCancellation(sessionId, socketId);
          return { status: "cancelled", sessionId };
        }

        console.log(
          `✅ Job not cancelled, proceeding with processing for session: ${sessionId}`
        );

        // Update session status to processing
        await updateSessionStatus(sessionId, AI_QUIZ_STATUS.PROCESSING, {
          currentStep: AI_QUIZ_STEPS.STARTING,
          percentage: 5,
          estimatedCompletion: new Date(Date.now() + 300000), // 5 minutes from now
        });

        // Mark session as started
        await aiQuizSessionsModel.findOneAndUpdate(
          { sessionId },
          { startedAt: new Date() }
        );

        console.log(
          `🔄 Session status updated to PROCESSING for session: ${sessionId}`
        );

        // Emit initial progress
        // emitProgress(socketId, sessionId, {
        //   step: AI_QUIZ_STEPS.STARTING,
        //   percentage: 5,
        //   message: "Initializing AI quiz generation...",
        //   status: AI_QUIZ_STATUS.PROCESSING,
        //   fileName: "Initialization",
        //   fileId: "init"
        // });

        // Import processors (lazy loading to avoid circular dependencies)
        console.log(`📦 Loading required modules for session: ${sessionId}`);
        const { DocumentProcessor } = await import(
          "../utils/document-processor"
        );
        const { ChatGPTService } = await import(
          "../services/ai-providers/chatgpt-service"
        );
        const { QuestionDeduplicator } = await import(
          "../utils/question-deduplication"
        );

        const documentProcessor = new DocumentProcessor(
          settings.chunkSize || AI_QUIZ_LIMITS.DEFAULT_CHUNK_SIZE
        );
        const chatGPTService = new ChatGPTService(app);
        const deduplicator = new QuestionDeduplicator();

        console.log(
          `✅ All modules loaded successfully for session: ${sessionId}`
        );

        const allQuestions = [];
        const totalFiles = files.length;

        console.log(
          `📁 Processing ${totalFiles} files for session: ${sessionId}`
        );

        // Process each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          console.log(
            `📄 Processing file ${i + 1}/${totalFiles}: ${
              file.fileName
            } for session: ${sessionId}`
          );

          // Update progress
          const fileStartProgress = Math.round((i / totalFiles) * 60) + 10; // 10-70%
          await updateSessionStatus(sessionId, AI_QUIZ_STATUS.PROCESSING, {
            filesProcessed: i,
            currentStep: `Processing ${file.fileName}`,
            percentage: fileStartProgress,
          });

          emitProgress(socketId, sessionId, {
            step: `Processing ${file.fileName}`,
            fileName: file.fileName,
            fileId: file.id,
            percentage: fileStartProgress,
            message: `Extracting text from ${file.fileName}...`,
          });

          // Process file and extract text
          console.log(
            `🔍 Extracting text from file: ${file.fileName} for session: ${sessionId}`
          );
          const processedFile = await documentProcessor.processFile(
            file,
            settings.chunkSize
          );
          console.log(
            `✅ File processed successfully: ${file.fileName}, chunks: ${processedFile.chunks.length} for session: ${sessionId}`
          );

          // Mark file as processed
          await aiQuizSessionsModel.findOneAndUpdate(
            { sessionId, "files.fileName": file.fileName },
            { $set: { "files.$.processedAt": new Date() } }
          );

          // Generate questions from chunks with optimized processing
          const fileQuestions = [];
          const chunkBatchSize = AI_QUIZ_LIMITS.CHUNK_BATCH_SIZE; // Process chunks in parallel for efficiency

          console.log(
            `🤖 Generating questions from ${processedFile.chunks.length} chunks for file: ${file.fileName} (session: ${sessionId})`
          );

          for (
            let j = 0;
            j < processedFile.chunks.length;
            j += chunkBatchSize
          ) {
            const chunkBatch = processedFile.chunks.slice(
              j,
              j + chunkBatchSize
            );

            console.log(
              `📦 Processing chunk batch ${
                Math.floor(j / chunkBatchSize) + 1
              }/${Math.ceil(
                processedFile.chunks.length / chunkBatchSize
              )} for file: ${file.fileName} (session: ${sessionId})`
            );

            // Update progress for chunk processing
            const chunkProgress =
              Math.round(
                ((j + chunkBatchSize) / processedFile.chunks.length) * 10
              ) + fileStartProgress;
            emitProgress(socketId, sessionId, {
              step: `Generating questions from ${file.fileName}`,
              fileName: file.fileName,
              fileId: file.id,
              percentage: Math.min(chunkProgress, 80),
              message: `Generating questions from chunks ${j + 1}-${Math.min(
                j + chunkBatchSize,
                processedFile.chunks.length
              )}`,
            });

            // Process chunks in parallel for better efficiency
            const chunkPromises = chunkBatch.map(async (chunk, batchIndex) => {
              console.log(
                `🧠 Generating questions for chunk ${
                  j + batchIndex + 1
                } of file: ${file.fileName} (session: ${sessionId})`
              );
              const questions = await chatGPTService.generateQuestions(
                { content: chunk },
                settings
              );

              console.log(
                `✅ Generated ${questions.length} questions for chunk ${
                  j + batchIndex + 1
                } of file: ${file.fileName} (session: ${sessionId})`
              );

              // Add source information
              return questions.map((q) => ({
                ...q,
                id: uuidv4()
              }));
            });

            const batchResults = await Promise.all(chunkPromises);
            fileQuestions.push(...batchResults.flat());

            console.log(
              `📊 Batch completed: ${
                batchResults.flat().length
              } questions generated for file: ${
                file.fileName
              } (session: ${sessionId})`
            );
          }

          allQuestions.push(...fileQuestions);
          console.log(
            `📈 Total questions generated for file ${file.fileName}: ${fileQuestions.length} (session: ${sessionId})`
          );

          // Update progress after file processing
          const fileEndProgress = Math.round(((i + 1) / totalFiles) * 60) + 10; // 10-70%
          await updateSessionStatus(sessionId, AI_QUIZ_STATUS.PROCESSING, {
            filesProcessed: i + 1,
            currentStep: `Completed ${file.fileName}`,
            percentage: fileEndProgress,
          });

          emitProgress(socketId, sessionId, {
            step: `Completed ${file.fileName}`,
            fileName: file.fileName,
            fileId: file.id,
            percentage: fileEndProgress,
            message: `Completed processing ${file.fileName}`,
          });
        }

        console.log(
          `🎯 All files processed. Total questions generated: ${allQuestions.length} for session: ${sessionId}`
        );

        // Deduplicate questions
        console.log(
          `🔍 Starting question deduplication for session: ${sessionId}`
        );
        const deduplicatedQuestions = await deduplicator.removeDuplicates(
          allQuestions
        );
        console.log(
          `✅ Deduplication completed. Questions after deduplication: ${
            deduplicatedQuestions.length
          } (removed ${
            allQuestions.length - deduplicatedQuestions.length
          } duplicates) for session: ${sessionId}`
        );
        // Select only the requested number of questions
        const requestedQuestions =
          settings.questionCount || AI_QUIZ_LIMITS.MIN_QUESTIONS_PER_REQUEST;
        const finalQuestions = selectRandomQuestions(
          deduplicatedQuestions,
          requestedQuestions
        );

        console.log(
          `🎲 Selected ${finalQuestions.length} random questions from ${deduplicatedQuestions.length} available for session: ${sessionId}`
        );

        // Send final questions to frontend via socket
        const socket = getSocketById(socketId);
        if (socket) {
          console.log(
            `📡 Emitting completed event to socket for session: ${sessionId}`
          );
          socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.COMPLETED, {
            sessionId,
            questions: finalQuestions,

            finalCount: finalQuestions.length,
            processingTime: Math.round((Date.now() - job.timestamp) / 1000), // in seconds
          });
        } else {
          console.warn(`⚠️ Socket not found for session: ${sessionId}`);
        }

        // Update session as completed
        await updateSessionStatus(sessionId, AI_QUIZ_STATUS.COMPLETED, {
          questionsGenerated: finalQuestions.length,
          currentStep: AI_QUIZ_STEPS.COMPLETED,
          percentage: 100,
        });

        console.log(
          `🎉 AI Quiz job completed successfully for session: ${sessionId}`
        );
        return { status: "completed", sessionId };
      } catch (error) {
        console.error(`❌ AI Quiz job failed for session: ${sessionId}`, error);

        // Update session as failed
        await updateSessionStatus(
          sessionId,
          AI_QUIZ_STATUS.FAILED,
          {
            currentStep: AI_QUIZ_STEPS.FAILED,
            percentage: 0,
          },
          typeof error === "object" && error && "message" in error
            ? (error as any).message
            : String(error)
        );

        const socket = getSocketById(socketId);
        if (socket) {
          console.log(
            `📡 Emitting error event to socket for session: ${sessionId}`
          );
          socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
            sessionId,
            error:
              typeof error === "object" && error && "message" in error
                ? (error as any).message
                : String(error) || "Failed to process AI quiz generation",
            code: AI_QUIZ_ERROR_CODES.GENERATION_ERROR,
          });
        } else {
          console.warn(
            `⚠️ Socket not found for error emission for session: ${sessionId}`
          );
        }

        return { status: "failed", sessionId };
      }
    },
    {
      connection,
      concurrency: AI_QUIZ_LIMITS.MAX_CONCURRENT_JOBS,
      limiter: {
        max: AI_QUIZ_LIMITS.CHATGPT_RATE_LIMIT,
        duration: 60000,
      },
    }
  );

  aiQuizWorker.on("completed", (job) => {
    console.log(
      `✅ Worker completed job: ${job.id} for session: ${job.data.sessionId}`
    );
  });

  aiQuizWorker.on("failed", (job, err) => {
    console.error(`❌ Worker failed job: ${job?.id}`, err);
  });

  // Assign the real implementations
  addAIQuizJob = async (jobData: any) => {
    console.log(
      `➕ Adding AI Quiz job to queue for session: ${jobData.sessionId}`
    );
    return aiQuizQueue.add("aiQuizJob", jobData);
  };

  cancelAIQuizJob = async (sessionId: string) => {
    console.log(`🚫 Cancelling AI Quiz job for session: ${sessionId}`);
    return queueManager.cancelJob(sessionId);
  };

  // Helper Functions
  const emitProgress = (socketId: string, sessionId: string, progress: any) => {
    const socket = getSocketById(socketId);
    if (socket) {
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.PROGRESS, {
        sessionId,
        ...progress,
      });
    } else {
      console.warn(
        `⚠️ Socket not found for progress emission for session: ${sessionId}`
      );
    }
  };

  // Select random questions from the available pool
  const selectRandomQuestions = (questions: any[], count: number): any[] => {
    if (questions.length <= count) {
      console.log(
        `📊 Returning all ${questions.length} questions (requested: ${count})`
      );
      return questions; // Return all questions if we have fewer than requested
    }

    console.log(
      `🎲 Selecting ${count} random questions from ${questions.length} available`
    );

    // Create a copy of the array and shuffle it
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return the first 'count' questions
    return shuffled.slice(0, count);
  };

  const updateSessionStatus = async (
    sessionId: string,
    status: string,
    progress: any,
    error?: string
  ) => {
    console.log(
      `📝 Updating session status for ${sessionId}: ${status}`,
      progress
    );

    const updateData: any = { status, progress };
    if (error) {
      updateData.error = {
        message: error,
        step: progress.currentStep,
        timestamp: new Date(),
      };
      console.error(`❌ Session error for ${sessionId}:`, error);
    }

    await aiQuizSessionsModel.findOneAndUpdate(
      { sessionId },
      { $set: updateData }
    );
  };

  const handleJobCancellation = async (sessionId: string, socketId: string) => {
    console.log(`🚫 Handling job cancellation for session: ${sessionId}`);

    // Update session as cancelled
    await updateSessionStatus(sessionId, AI_QUIZ_STATUS.CANCELLED, {
      currentStep: AI_QUIZ_STEPS.CANCELLED,
      percentage: 0,
    });

    const socket = getSocketById(socketId);
    if (socket) {
      console.log(
        `📡 Emitting cancellation event to socket for session: ${sessionId}`
      );
      socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.CANCELLED, {
        sessionId,
        message: "Quiz generation was cancelled",
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn(
        `⚠️ Socket not found for cancellation emission for session: ${sessionId}`
      );
    }

    // Clear cancellation flag
    await queueManager.clearCancellationFlag(sessionId);
    console.log(`🧹 Cleared cancellation flag for session: ${sessionId}`);
  };

  console.log("✅ AI Quiz Processor initialized successfully");
}
