export const AI_QUIZ_SOCKET_EVENTS = {
  // Client to Server Events (Frontend sends these to Backend)
  CLIENT_TO_SERVER: {
    GENERATE: "aiQuizGenerate",
    GET_STATUS: "aiQuizGetStatus", 
    CANCEL: "aiQuizCancel",
    GET_QUEUE_STATUS: "aiQuizQueueStatus",
  },
  
  // Server to Client Events (Backend sends these to Frontend)
  SERVER_TO_CLIENT: {
    STARTED: "aiQuizStarted",
    PROGRESS: "aiQuizProgress",
    STATUS: "aiQuizStatus",
    COMPLETED: "aiQuizCompleted",
    CANCELLED: "aiQuizCancelled",
    FAILED: "aiQuizFailed",
    ERROR: "aiQuizError",
    QUEUE_STATUS: "aiQuizQueueStatus",
  }
} as const;

export const AI_QUIZ_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const AI_QUIZ_STEPS = {
  QUEUED: "Queued",
  STARTING: "Starting file processing",
  PROCESSING_FILE: "Processing file",
  EXTRACTING_TEXT: "Extracting text",
  GENERATING_QUESTIONS: "Generating questions",
  FINALIZING: "Finalizing questions",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
} as const;

export const AI_QUIZ_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  FILES_NOT_FOUND: "FILES_NOT_FOUND",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  GENERATION_ERROR: "GENERATION_ERROR",
  STATUS_ERROR: "STATUS_ERROR",
  CANCEL_ERROR: "CANCEL_ERROR",
  QUEUE_STATUS_ERROR: "QUEUE_STATUS_ERROR",
  FILE_PROCESSING_ERROR: "FILE_PROCESSING_ERROR",
  AI_API_ERROR: "AI_API_ERROR",
  DEDUPLICATION_ERROR: "DEDUPLICATION_ERROR",
  QUEUE_FULL: "QUEUE_FULL",
  INVALID_SESSION: "INVALID_SESSION",
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const;

export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "ppt", "pptx"] as const;

export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple-choice",
  MULTI_SELECT: "multi-select",
  TRUE_FALSE: "true-false",
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export const AI_QUIZ_LIMITS = {
  MAX_CONCURRENT_JOBS: 2,
  MAX_QUEUE_SIZE: 20,
  RATE_LIMIT_PER_USER: 3, // 3 requests per hour
  RATE_LIMIT_WINDOW: 3600000, // 1 hour in milliseconds
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_REQUEST: 10,
  MAX_QUESTIONS_PER_REQUEST: 50,
  MIN_QUESTIONS_PER_REQUEST: 5,
  MAX_TOKENS_PER_CHUNK: 3000,
  CHATGPT_RATE_LIMIT: 10, // 10 requests per minute
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  // Chunk processing configuration
  DEFAULT_CHUNK_SIZE: 2000, // Default characters per chunk
  MIN_CHUNK_SIZE: 500, // Minimum characters per chunk
  MAX_CHUNK_SIZE: 3000, // Maximum characters per chunk
  CHUNK_BATCH_SIZE: 3, // Number of chunks to process in parallel
  MIN_CHUNK_LENGTH: 100, // Minimum chunk length to keep
} as const; 