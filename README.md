# xtcare-lms-api


> 

## About

This project uses [Feathers](http://feathersjs.com). An open source web framework for building modern real-time applications.

## Getting Started

Getting up and running is as easy as 1, 2, 3.

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
2. Install your dependencies

    ```
    cd path/to/xtcare-lms-api
    npm install
    ```

3. Start your app

    ```
    npm start
    ```

## Testing

Simply run `npm test` and all your tests in the `test/` directory will be run.

## Scaffolding

Feathers has a powerful command line interface. Here are a few things it can do:

```
$ npm install -g @feathersjs/cli          # Install Feathers CLI

$ feathers generate service               # Generate a new Service
$ feathers generate hook                  # Generate a new Hook
$ feathers help                           # Show all commands
```

## Help

For more information on all the things you can do with Feathers visit [docs.feathersjs.com](http://docs.feathersjs.com).

## Running AI Quiz Builder Main Flow Test

All commands below should be run from the `xtcare-lms-api` directory.

1. **Install dependencies (if not already installed):**

   ```bash
   yarn add -D mocha @types/mocha socket.io-client @types/socket.io-client
   ```

2. **Run the main flow test:**

   ```bash
   yarn mocha test/ai-quiz-builder/main-flow.test.ts --timeout 60000
   ```

## 📋 **3. Processing Workflow Documentation**

**File: `/docs/ai-quiz-builder/processing-workflow.md`**

```markdown
# AI Quiz Builder - Processing Workflow

Detailed step-by-step documentation of the AI quiz generation process flow.

## 🔄 Overview

The AI Quiz Builder follows a comprehensive workflow that processes uploaded documents, generates questions using AI, and delivers results in real-time. The process is designed to be robust, scalable, and user-friendly.

## 📊 Process Flow Diagram

```
Client Request → Validation → Session Creation → Queue Management → 
Document Processing → Question Generation → Deduplication → 
Finalization → Client Response
```

## 🔧 Detailed Process Steps

### 1. Request Validation

**Purpose**: Ensure all inputs are valid and meet system requirements

**Steps**:
1. **Validate Course ID**: Ensure course exists and user has access
2. **Validate Files**: Check file types, sizes, and existence in media library
3. **Validate Settings**: Ensure question count and types are within limits
4. **Check Rate Limits**: Verify user hasn't exceeded rate limits

**Code Example**:
```typescript
const validateGenerateRequest = (data: any) => {
  const { courseId, files, settings } = data;
  
  if (!courseId) {
    return { error: "Course ID is required", code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
  }
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    return { error: "At least one file is required", code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
  }
  
  if (files.length > AI_QUIZ_LIMITS.MAX_FILES_PER_REQUEST) {
    return { error: `Maximum ${AI_QUIZ_LIMITS.MAX_FILES_PER_REQUEST} files allowed`, code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
  }
  
  if (settings?.questionCount) {
    if (settings.questionCount < AI_QUIZ_LIMITS.MIN_QUESTIONS_PER_REQUEST || 
        settings.questionCount > AI_QUIZ_LIMITS.MAX_QUESTIONS_PER_REQUEST) {
      return { error: `Question count must be between ${AI_QUIZ_LIMITS.MIN_QUESTIONS_PER_REQUEST} and ${AI_QUIZ_LIMITS.MAX_QUESTIONS_PER_REQUEST}`, code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
    }
  }
  
  return null;
};
```

### 2. Session Creation

**Purpose**: Create a database record to track the quiz generation session

**Steps**:
1. **Generate Session ID**: Create unique identifier for the session
2. **Create Database Record**: Store session information in `aiQuizSessions` collection
3. **Initialize Progress**: Set initial progress values
4. **Validate Files**: Ensure files exist in media library

**Code Example**:
```typescript
const sessionId = uuidv4();

const session = await aiQuizSessionsModel.create({
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
    questionTypes: settings.questionTypes || ['multiple-choice'],
    difficulty: settings.difficulty || 'medium',
    language: settings.language || 'en'
  },
  progress: {
    filesProcessed: 0,
    totalFiles: validatedFiles.length,
    questionsGenerated: 0,
    currentStep: AI_QUIZ_STEPS.QUEUED,
    percentage: 0
  }
});
```

### 3. Queue Management

**Purpose**: Add the job to the processing queue and manage concurrency

**Steps**:
1. **Add to Queue**: Add job to BullMQ processing queue
2. **Calculate Position**: Determine queue position and estimated wait time
3. **Update Session**: Store queue information in session record
4. **Emit Started Event**: Notify client that processing has started

**Code Example**:
```typescript
// Add to processing queue
await addAIQuizJob({
  sessionId,
  userId,
  courseId,
  files: validatedFiles,
  settings: session.settings,
  socketId: socket.id
});

// Get queue position and estimated time
const queuePosition = await queueManager.getQueuePosition(sessionId);
const estimatedWaitTime = queuePosition * 120; // 2 minutes per job estimate

// Update session with queue info
await aiQuizSessionsModel.findOneAndUpdate(
  { sessionId },
  {
    queuePosition,
    'progress.estimatedCompletion': new Date(Date.now() + estimatedWaitTime * 1000)
  }
);

// Emit started event
socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.STARTED, {
  sessionId,
  status: AI_QUIZ_STATUS.PENDING,
  message: 'AI quiz generation started successfully',
  queuePosition,
  estimatedWaitTime,
  totalFiles: validatedFiles.length,
  settings: session.settings
});
```

### 4. Document Processing

**Purpose**: Extract text content from uploaded files for question generation

**Steps**:
1. **Download Files**: Retrieve files from S3 storage
2. **Extract Text**: Convert files to text content
3. **Chunk Content**: Split text into manageable chunks
4. **Update Progress**: Track processing progress for each file

**Code Example**:
```typescript
// Process each file
for (let i = 0; i < files.length; i++) {
  const file = files[i];

  // Update progress
  const fileStartProgress = Math.round((i / totalFiles) * 60) + 10; // 10-70%
  await updateSessionStatus(sessionId, AI_QUIZ_STATUS.PROCESSING, {
    filesProcessed: i,
    currentStep: `Processing ${file.fileName}`,
    percentage: fileStartProgress,
  });

  emitProgress(socketId, sessionId, {
    step: `Processing ${file.fileName}`,
    percentage: fileStartProgress,
    message: `Extracting text from ${file.fileName}...`,
  });

  // Process file and extract text
  const processedFile = await documentProcessor.processFile(file);

  // Mark file as processed
  await aiQuizSessionsModel.findOneAndUpdate(
    { sessionId, "files.fileName": file.fileName },
    { $set: { "files.$.processedAt": new Date() } }
  );
}
```

### 5. Question Generation

**Purpose**: Use AI to generate questions from processed text content

**Steps**:
1. **Process Chunks**: Generate questions for each text chunk
2. **Call ChatGPT API**: Use OpenAI API for question generation
3. **Add Metadata**: Include source information and question details
4. **Handle Rate Limits**: Respect API rate limits and retry on failures

**Code Example**:
```typescript
// Generate questions from chunks
const fileQuestions = [];
for (let j = 0; j < processedFile.chunks.length; j++) {
  const chunk = processedFile.chunks[j];

  // Update progress for chunk processing
  const chunkProgress = Math.round(((j + 1) / processedFile.chunks.length) * 10) + fileStartProgress;
  emitProgress(socketId, sessionId, {
    step: `Generating questions from ${file.fileName}`,
    percentage: Math.min(chunkProgress, 80),
    message: `Generating questions from chunk ${j + 1}`,
  });

  // Generate questions using ChatGPT
  const questions = await chatGPTService.generateQuestions(
    { content: chunk },
    settings
  );

  // Add source information
  const questionsWithSource = questions.map((q) => ({
    ...q,
    id: uuidv4(),
    sourceFile: file.fileName,
    sourceChunk: j,
  }));

  fileQuestions.push(...questionsWithSource);
}
```

### 6. Deduplication

**Purpose**: Remove duplicate questions and ensure quality

**Steps**:
1. **Hash Questions**: Create hashes for question comparison
2. **Check Cache**: Look for existing questions in cache
3. **Similarity Check**: Use similarity algorithms for near-duplicates
4. **Remove Duplicates**: Filter out duplicate questions

**Code Example**:
```typescript
// Deduplicate questions
const deduplicatedQuestions = await deduplicator.removeDuplicates(
  allQuestions,
  courseId,
  userId
);
```

### 7. Finalization

**Purpose**: Complete the process and deliver results to client

**Steps**:
1. **Update Session**: Mark session as completed
2. **Send Results**: Emit completion event with questions
3. **Clean Up**: Remove temporary data and update statistics
4. **Log Completion**: Record processing time and statistics

**Code Example**:
```typescript
// Send final questions to frontend via socket
const socket = getSocketById(socketId);
if (socket) {
  socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.COMPLETED, {
    sessionId,
    questions: deduplicatedQuestions,
    totalGenerated: allQuestions.length,
    finalCount: deduplicatedQuestions.length,
    duplicatesRemoved: allQuestions.length - deduplicatedQuestions.length,
    processingTime: Math.round((Date.now() - job.timestamp) / 1000), // in seconds
  });
}

// Update session as completed
await updateSessionStatus(sessionId, AI_QUIZ_STATUS.COMPLETED, {
  questionsGenerated: deduplicatedQuestions.length,
  currentStep: AI_QUIZ_STEPS.COMPLETED,
  percentage: 100,
});
```

## 🔄 Progress Tracking

### Progress Steps

```typescript
export const AI_QUIZ_STEPS = {
  QUEUED: "Queued",
  STARTING: "Starting",
  PROCESSING: "Processing files",
  GENERATING: "Generating questions",
  FINALIZING: "Preparing final questions",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled"
} as const;
```

### Progress Calculation

```typescript
// File processing: 10-70% (60% of total progress)
const fileProgress = Math.round((filesProcessed / totalFiles) * 60) + 10;

// Question generation: 70-95% (25% of total progress)
const generationProgress = Math.round((questionsGenerated / targetQuestions) * 25) + 70;

// Finalization: 95-100% (5% of total progress)
const finalizationProgress = 95 + Math.round((finalSteps / totalSteps) * 5);
```

## 🚀 Performance Optimization

### 1. Concurrent Processing

```typescript
// Worker configuration
const aiQuizWorker = new Worker(
  "aiQuizProcessing",
  async (job: Job) => {
    // Process job
  },
  {
    connection,
    concurrency: AI_QUIZ_LIMITS.MAX_CONCURRENT_JOBS, // 3 concurrent jobs
    limiter: {
      max: AI_QUIZ_LIMITS.CHATGPT_RATE_LIMIT, // 10 requests per minute
      duration: 60000,
    },
  }
);
```

### 2. Lazy Loading

```typescript
// Import processors only when needed
const { DocumentProcessor } = await import("../utils/document-processor");
const { ChatGPTService } = await import("../services/ai-providers/chatgpt-service");
const { QuestionDeduplicator } = await import("../utils/question-deduplication");
```

### 3. Memory Management

```typescript
// Clean up completed jobs
export const aiQuizQueue = new Queue("aiQuizProcessing", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5,      // Keep last 5 failed jobs
    attempts: 2,          // Retry failed jobs twice
    backoff: { type: "exponential", delay: 5000 },
    delay: 0,
  },
});
```

## 🔧 Error Handling

### 1. Job Cancellation

```typescript
// Check if job was cancelled before starting
if (await queueManager.isJobCancelled(sessionId)) {
  await handleJobCancellation(sessionId, socketId);
  return { status: "cancelled", sessionId };
}
```

### 2. API Failures

```typescript
try {
  const questions = await chatGPTService.generateQuestions(chunk, settings);
  return questions;
} catch (error) {
  console.error('Error generating questions:', error);
  throw new Error('Failed to generate questions after multiple attempts');
}
```

### 3. File Processing Errors

```typescript
try {
  const processedFile = await documentProcessor.processFile(file);
  return processedFile;
} catch (error) {
  console.error(`Error processing file ${fileName}:`, error);
  throw new Error(`Failed to process file ${fileName}`);
}
```

## 📊 Monitoring and Metrics

### Key Metrics

```typescript
// Processing time per session
const processingTime = Math.round((Date.now() - job.timestamp) / 1000);

// Questions generated per file
const questionsPerFile = allQuestions.length / files.length;

// Duplicate removal rate
const duplicateRate = (allQuestions.length - deduplicatedQuestions.length) / allQuestions.length;

// Success rate
const successRate = completedSessions / totalSessions;
```

### Logging

```typescript
// Log key events
console.log(`[AI Quiz Worker] Starting job for session ${sessionId}`);
console.log(`[AI Quiz Worker] Completed job for session ${sessionId}`);
console.log(`[AI Quiz Worker] Job failed for session ${sessionId}:`, error);
```

---

**Related Documentation**:
- [Socket Events](./socket-events.md) - Real-time communication during processing
- [Error Handling](./error-handling.md) - Error handling during processing
- [Database Models](./database-models.md) - Session tracking during processing
- [Testing Guide](./testing-guide.md) - Testing the processing workflow
```

## 📋 **4. Error Handling Documentation**

**File: `/docs/ai-quiz-builder/error-handling.md`**

```markdown
# AI Quiz Builder - Error Handling

Comprehensive guide to error codes, handling strategies, and troubleshooting for the AI Quiz Builder system.

## ❌ Error Overview

The AI Quiz Builder implements a robust error handling system that provides clear error messages, appropriate HTTP status codes, and actionable solutions for developers and users.

## 🔧 Error Code System

### Error Code Constants

```typescript
export const AI_QUIZ_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILES_NOT_FOUND: 'FILES_NOT_FOUND',
  GENERATION_ERROR: 'GENERATION_ERROR',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  CANCEL_ERROR: 'CANCEL_ERROR',
  STATUS_ERROR: 'STATUS_ERROR',
  QUEUE_STATUS_ERROR: 'QUEUE_STATUS_ERROR'
} as const;
```

### Error Response Format

```typescript
interface ErrorResponse {
  sessionId?: string;     // Session ID (if available)
  error: string;         // Human-readable error message
  code: string;          // Error code for programmatic handling
  timestamp?: string;    // Error timestamp
  retryAfter?: number;   // Retry after seconds (for rate limits)
  details?: any;         // Additional error details
}
```

## 📋 Error Code Reference

### 1. INVALID_INPUT

**Code**: `INVALID_INPUT`  
**HTTP Status**: 400  
**Description**: Missing or invalid input parameters

**Common Causes**:
- Missing course ID
- Missing or empty files array
- Invalid file types
- Question count outside allowed range
- Missing session ID for status/cancel operations

**Example**:
```typescript
{
  error: "Course ID is required",
  code: "INVALID_INPUT"
}
```

**Resolution**:
```typescript
// Ensure all required fields are provided
const validateGenerateRequest = (data: any) => {
  const { courseId, files, settings } = data;
  
  if (!courseId) {
    return { error: "Course ID is required", code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
  }
  
  if (!files || !Array.isArray(files) || files.length === 0) {
    return { error: "At least one file is required", code: AI_QUIZ_ERROR_CODES.INVALID_INPUT };
  }
  
  return null;
};
```

### 2. RATE_LIMIT_EXCEEDED

**Code**: `RATE_LIMIT_EXCEEDED`  
**HTTP Status**: 429  
**Description**: User has exceeded rate limits for quiz generation

**Common Causes**:
- Too many concurrent requests
- Exceeded daily/monthly limits
- API rate limits from OpenAI

**Example**:
```typescript
{
  error: "Rate limit exceeded. Please try again later.",
  code: "RATE_LIMIT_EXCEEDED",
  retryAfter: 300
}
```

**Resolution**:
```typescript
// Check rate limits before processing
const canProcess = await queueManager.canProcessRequest(userId);
if (!canProcess) {
  socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
    error: "Rate limit exceeded. Please try again later.",
    code: AI_QUIZ_ERROR_CODES.RATE_LIMIT_EXCEEDED,
    retryAfter: await queueManager.getRetryAfter(userId)
  });
  return;
}
```

### 3. FILES_NOT_FOUND

**Code**: `FILES_NOT_FOUND`  
**HTTP Status**: 404  
**Description**: Requested files not found in media library

**Common Causes**:
- Files deleted from media library
- Incorrect file IDs
- Permission issues
- Files not uploaded to S3

**Example**:
```typescript
{
  error: "No valid files found in media library",
  code: "FILES_NOT_FOUND"
}
```

**Resolution**:
```typescript
// Validate files exist in media library
const validatedFiles = await validateFiles(files, courseId, userId);
if (!validatedFiles.length) {
  socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
    error: "No valid files found in media library",
    code: AI_QUIZ_ERROR_CODES.FILES_NOT_FOUND
  });
  return;
}
```

### 4. GENERATION_ERROR

**Code**: `GENERATION_ERROR`  
**HTTP Status**: 500  
**Description**: Error during quiz generation process

**Common Causes**:
- OpenAI API failures
- File processing errors
- Memory issues
- Network timeouts

**Example**:
```typescript
{
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  error: "Failed to process document content",
  code: "GENERATION_ERROR",
  timestamp: "2024-01-01T10:30:00.000Z"
}
```

**Resolution**:
```typescript
try {
  const questions = await chatGPTService.generateQuestions(chunk, settings);
  return questions;
} catch (error) {
  console.error('Error generating questions:', error);
  throw new Error('Failed to generate questions after multiple attempts');
}
```

### 5. SESSION_NOT_FOUND

**Code**: `SESSION_NOT_FOUND`  
**HTTP Status**: 404  
**Description**: Requested session not found

**Common Causes**:
- Invalid session ID
- Session expired
- Session deleted
- User doesn't own the session

**Example**:
```typescript
{
  error: "Session not found",
  code: "SESSION_NOT_FOUND"
}
```

**Resolution**:
```typescript
// Verify session exists and belongs to user
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
```

### 6. CANCEL_ERROR

**Code**: `CANCEL_ERROR`  
**HTTP Status**: 500  
**Description**: Error cancelling session

**Common Causes**:
- Session already completed
- Queue management issues
- Database update failures

**Example**:
```typescript
{
  error: "Failed to cancel generation",
  code: "CANCEL_ERROR"
}
```

**Resolution**:
```typescript
try {
  await cancelAIQuizJob(sessionId);
  await aiQuizSessionsModel.findOneAndUpdate(
    { sessionId },
    { 
      status: AI_QUIZ_STATUS.CANCELLED,
      'progress.currentStep': AI_QUIZ_STEPS.CANCELLED,
      'progress.percentage': 0,
      completedAt: new Date()
    }
  );
} catch (error) {
  console.log("Error in aiQuizCancel:", error);
  socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, { 
    error: "Failed to cancel generation",
    code: AI_QUIZ_ERROR_CODES.CANCEL_ERROR
  });
}
```

### 7. STATUS_ERROR

**Code**: `STATUS_ERROR`  
**HTTP Status**: 500  
**Description**: Error retrieving session status

**Common Causes**:
- Database connection issues
- Invalid session data
- Permission problems

**Example**:
```typescript
{
  error: "Failed to get session status",
  code: "STATUS_ERROR"
}
```

### 8. QUEUE_STATUS_ERROR

**Code**: `QUEUE_STATUS_ERROR`  
**HTTP Status**: 500  
**Description**: Error retrieving queue status

**Common Causes**:
- Redis connection issues
- Queue manager failures
- Rate limit calculation errors

**Example**:
```typescript
{
  error: "Failed to get queue status",
  code: "QUEUE_STATUS_ERROR"
}
```

## 🔧 Error Handling Strategies

### 1. Client-Side Error Handling

```typescript
// Listen for all error events
socket.on('aiQuizError', (data) => {
  console.error('Error:', data.error);
  console.error('Code:', data.code);
  
  // Handle specific error types
  switch (data.code) {
    case 'RATE_LIMIT_EXCEEDED':
      showRateLimitMessage(data.retryAfter);
      break;
    case 'FILES_NOT_FOUND':
      showFileNotFoundMessage();
      break;
    case 'GENERATION_ERROR':
      showGenerationErrorMessage();
      break;
    default:
      showGenericErrorMessage(data.error);
  }
});
```

### 2. Server-Side Error Handling

```typescript
// Comprehensive error handling in worker
try {
  // Process job
  const result = await processQuizGeneration(job.data);
  return result;
} catch (error) {
  console.error(`[AI Quiz Worker] Error processing job for session ${sessionId}:`, error);
  
  // Update session as failed
  await updateSessionStatus(
    sessionId,
    AI_QUIZ_STATUS.FAILED,
    {
      currentStep: AI_QUIZ_STEPS.FAILED,
      percentage: 0,
    },
    error.message
  );
  
  // Notify client
  const socket = getSocketById(socketId);
  if (socket) {
    socket.emit(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, {
      sessionId,
      error: error.message || "Failed to process AI quiz generation",
      code: AI_QUIZ_ERROR_CODES.GENERATION_ERROR,
    });
  }
  
  return { status: "failed", sessionId };
}
```

### 3. Retry Logic

```typescript
// Retry failed API calls
async function generateQuestionsWithRetry(chunk: any, settings: any, maxRetries = 3) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const response = await openai.completions.create({
        model: 'text-davinci-003',
        prompt: buildPrompt(chunk.content, settings),
        max_tokens: AI_QUIZ_LIMITS.MAX_TOKENS_PER_CHUNK,
        n: settings.questionCount,
        stop: ['\n'],
      });
      
      return response.choices.map((choice: any) => ({
        id: uuidv4(),
        question: choice.text.trim(),
        options: [],
        answer: ''
      }));
    } catch (error) {
      attempts++;
      console.error('Error generating questions:', error);
      
      if (attempts >= maxRetries) {
        throw new Error('Failed to generate questions after multiple attempts');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
}
```

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Rate Limit Issues

**Symptoms**:
- `RATE_LIMIT_EXCEEDED` errors
- Slow response times
- Queue position not decreasing

**Solutions**:
```typescript
// Check current rate limits
const rateLimitInfo = await queueManager.getRateLimitInfo(userId);
console.log('Requests remaining:', rateLimitInfo.requestsRemaining);
console.log('Reset time:', rateLimitInfo.resetTime);

// Implement exponential backoff
const retryAfter = rateLimitInfo.retryAfter || 300;
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
```

#### 2. File Processing Issues

**Symptoms**:
- `FILES_NOT_FOUND` errors
- Empty question results
- Processing timeouts

**Solutions**:
```typescript
// Validate file accessibility
const validateFileAccess = async (file: any) => {
  try {
    const response = await axios.head(file.s3Url);
    return response.status === 200;
  } catch (error) {
    console.error('File access error:', error);
    return false;
  }
};

// Check file size and type
const validateFileFormat = (file: any) => {
  const allowedTypes = ['pdf', 'docx', 'txt'];
  const fileExtension = file.fileName.split('.').pop()?.toLowerCase();
  
  if (!allowedTypes.includes(fileExtension)) {
    throw new Error(`Unsupported file type: ${fileExtension}`);
  }
  
  if (file.fileSize > AI_QUIZ_LIMITS.MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.fileSize} bytes`);
  }
};
```

#### 3. Memory Issues

**Symptoms**:
- Process crashes
- Slow performance
- Out of memory errors

**Solutions**:
```typescript
// Implement streaming for large files
const processLargeFile = async (file: any) => {
  const stream = await createReadStream(file.s3Url);
  const chunks = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    stream.on('end', () => {
      const content = Buffer.concat(chunks).toString();
      resolve(content);
    });
    
    stream.on('error', reject);
  });
};

// Clean up memory after processing
const cleanup = () => {
  global.gc && global.gc();
};
```

#### 4. Network Issues

**Symptoms**:
- Timeout errors
- Connection failures
- Incomplete responses

**Solutions**:
```typescript
// Implement timeout handling
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Request timeout')), 30000);
});

const apiCallWithTimeout = async (apiCall: Promise<any>) => {
  return Promise.race([apiCall, timeoutPromise]);
};

// Implement circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000;
  
  async execute(fn: () => Promise<any>) {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen() {
    return this.failures >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout;
  }
  
  private onSuccess() {
    this.failures = 0;
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

## 🚨 Error Monitoring

### Error Logging

```typescript
// Structured error logging
const logError = (error: any, context: any) => {
  console.error({
    timestamp: new Date().toISOString(),
    error: error.message,
    code: error.code,
    stack: error.stack,
    context,
    sessionId: context.sessionId,
    userId: context.userId,
    courseId: context.courseId
  });
};
```

### Error Metrics

```typescript
// Track error rates
const errorMetrics = {
  totalErrors: 0,
  errorsByCode: {},
  errorsBySession: {},
  
  recordError(code: string, sessionId?: string) {
    this.totalErrors++;
    this.errorsByCode[code] = (this.errorsByCode[code] || 0) + 1;
    
    if (sessionId) {
      this.errorsBySession[sessionId] = (this.errorsBySession[sessionId] || 0) + 1;
    }
  },
  
  getErrorRate() {
    return this.totalErrors / totalRequests;
  }
};
```

---

**Related Documentation**:
- [Processing Workflow](./processing-workflow.md) - Error handling during processing
- [Socket Events](./socket-events.md) - Error communication patterns
- [Testing Guide](./testing-guide.md) - Error testing strategies
- [Database Models](./database-models.md) - Error tracking in sessions
```

## 📋 **5. Testing Guide Documentation**

**File: `/docs/ai-quiz-builder/testing-guide.md`**

```markdown
# AI Quiz Builder - Testing Guide

Comprehensive testing strategy and examples for the AI Quiz Builder system.

##  Testing Overview

The AI Quiz Builder includes comprehensive testing to ensure reliability, performance, and correctness of the quiz generation system.

## 📋 Test Structure

### Test Categories

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - End-to-end workflow testing
3. **Performance Tests** - Load and stress testing
4. **Error Tests** - Error handling and edge cases
5. **API Tests** - Socket communication testing

##  Test Setup

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev mocha @types/mocha socket.io-client @types/socket.io-client

# Set test environment
export NODE_ENV=test
```

### Test Configuration

```typescript
// test/ai-quiz-builder/main-flow.test.ts
import assert from "assert";
import Client from "socket.io-client";
import app from "../../src/app";
import { aiQuizQueue } from "../../src/processors/ai-quiz-processor";
import createAIQuizSessionsModel from "../../src/models/ai-quiz-sessions.model";
import {
  AI_QUIZ_SOCKET_EVENTS,
  AI_QUIZ_STATUS,
  AI_QUIZ_ERROR_CODES,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS
} from "../../src/utils/consts/ai-quiz-constants";

describe("AI Quiz Builder - Main Flow Test", function () {
  this.timeout(60000); // Set timeout to 60 seconds for all tests
  
  // Set test environment
  process.env.NODE_ENV = "test";
  
  let client: any;
  let aiQuizSessionsModel: any;
  let testToken: string;
});
```

##  Test Examples

### 1. Full Generation Flow Test

```typescript
it("should complete full AI Quiz generation flow successfully", (done) => {
  console.log("[TEST] Connecting to serverUrl:", serverUrl);
  console.log("[TEST] Creating socket client with token:", testToken);
  client = Client(serverUrl, {
    query: {
      token: "test-token"
    }
  });

  let connectCount = 0;
  let disconnectCount = 0;
  let errorCount = 0;

  const logEventCounts = () => {
    console.log("[TEST] Total socket connects:", connectCount);
    console.log("[TEST] Total socket disconnects:", disconnectCount);
    console.log("[TEST] Total socket errors:", errorCount);
  };

  client.on("connect", () => {
    connectCount++;
    console.log("[TEST] Socket connected! (count:", connectCount, ")");
    console.log("[TEST] Emitting aiQuizGenerate event from test client");
    client.emit(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GENERATE, {
      courseId: testCourse._id,
      files: realS3Files,
      settings: testSettings
    });
  });

  const flowEvents: any[] = [];
  let sessionId: string;

  client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.STARTED, (data: any) => {
    flowEvents.push({ step: "generation_started", data });
    sessionId = data.sessionId;
    
    assert.ok(data.sessionId, "Session ID should be present");
    assert.strictEqual(data.status, AI_QUIZ_STATUS.PROCESSING, "Status should be PROCESSING");
    assert.ok(data.message, "Should have a message");
  });

  client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.PROGRESS, (data: any) => {
    flowEvents.push({ step: "progress_update", data });
    
    assert.strictEqual(data.sessionId, sessionId, "Session ID should match");
    assert.ok(data.percentage >= 0 && data.percentage <= 100, "Percentage should be 0-100");
    assert.ok(data.step, "Should have current step");
    assert.ok(data.message, "Should have progress message");
  });

  client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.COMPLETED, (data: any) => {
    flowEvents.push({ step: "generation_completed", data });
    
    assert.strictEqual(data.sessionId, sessionId, "Session ID should match");
    assert.ok(Array.isArray(data.questions), "Questions should be an array");
    assert.ok(typeof data.totalGenerated === "number", "Total generated should be number");
    assert.ok(typeof data.finalCount === "number", "Final count should be number");
    assert.ok(typeof data.duplicatesRemoved === "number", "Duplicates removed should be number");
    assert.ok(typeof data.processingTime === "number", "Processing time should be number");

    if (data.questions.length > 0) {
      const question = data.questions[0];
      assert.ok(question.id, "Question should have ID");
      assert.ok(question.question, "Question should have text");
      assert.ok(question.type, "Question should have type");
      assert.ok(Array.isArray(question.options), "Question should have options array");
      assert.ok(question.correctAnswer, "Question should have correct answer");
      assert.ok(question.sourceFile, "Question should have source file");
      assert.ok(typeof question.sourceChunk === "number", "Question should have source chunk");
    }

    const eventSteps = flowEvents.map(e => e.step);
    assert.ok(flowEvents.length >= 4, "Should have at least 4 flow events");
    assert.ok(eventSteps.includes("socket_connected"), "Should have socket connection");
    assert.ok(eventSteps.includes("generation_started"), "Should have generation started");
    assert.ok(eventSteps.includes("generation_completed"), "Should have generation completed");
    
    const progressEvents = flowEvents.filter(e => e.step === "progress_update");
    assert.ok(progressEvents.length > 0, "Should have at least one progress update");

    logEventCounts();
    done();
  });

  client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, (data: any) => {
    flowEvents.push({ step: "error_occurred", data });
    logEventCounts();
    done(new Error(`Unexpected error in flow: ${data.error}`));
  });
});
```

### 2. Error Handling Test

```typescript
it("should handle invalid input gracefully", (done) => {
  client = Client(serverUrl);

  client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, (data: any) => {
    assert.strictEqual(data.code, AI_QUIZ_ERROR_CODES.INVALID_INPUT, "Should have invalid input error code");
    assert.ok(data.error, "Should have error message");
    assert.ok(data.sessionId, "Should have session ID");
    
    done();
  });

  client.emit(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GENERATE, {
    files: realS3Files,
    settings: testSettings
    // Missing courseId to trigger invalid input error
  });
});
```

### 3. Database Session Tracking Test

```typescript
it("should track session in database", async () => {
  client = Client(serverUrl);
  
  return new Promise((resolve, reject) => {
    let sessionId: string;

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.STARTED, async (data: any) => {
      sessionId = data.sessionId;
      
      const session = await aiQuizSessionsModel.findOne({ sessionId });
      assert.ok(session, "Session should exist in database");
      assert.strictEqual(session.status, AI_QUIZ_STATUS.PROCESSING, "Session status should be PROCESSING");
      assert.strictEqual(session.userId.toString(), testUser._id, "User ID should match");
      assert.strictEqual(session.courseId.toString(), testCourse._id, "Course ID should match");
    });

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.COMPLETED, async (data: any) => {
      const session = await aiQuizSessionsModel.findOne({ sessionId });
      assert.strictEqual(session.status, AI_QUIZ_STATUS.COMPLETED, "Session should be completed");
      assert.strictEqual(session.progress.percentage, 100, "Progress should be 100%");
      
      resolve();
    });

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, (data: any) => {
      reject(new Error(`Unexpected error: ${data.error}`));
    });

    client.emit(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GENERATE, {
      courseId: testCourse._id,
      files: realS3Files,
      settings: testSettings
    });
  });
});
```

### 4. File Processing Test

```typescript
it("should process S3 file and generate meaningful questions", (done) => {
  client = Client(serverUrl);
  
  return new Promise((resolve, reject) => {
    let fileProcessed = false;

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.PROGRESS, (data: any) => {
      if (data.step.includes("Processing") && data.step.includes("1741031192984_Mdl_2.pdf")) {
        fileProcessed = true;
      }
    });

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.COMPLETED, async (data: any) => {
      assert.ok(fileProcessed, "S3 file should have been processed");
      assert.ok(data.questions.length > 0, "Should generate questions from PDF content");
      
      const meaningfulQuestions = data.questions.filter((q: any) => 
        q.question.length > 20 && 
        q.question.includes("?") &&
        q.options.length >= 2
      );
      
      assert.ok(meaningfulQuestions.length > 0, "Should have meaningful questions");
      
      resolve();
    });

    client.on(AI_QUIZ_SOCKET_EVENTS.SERVER_TO_CLIENT.ERROR, (data: any) => {
      reject();
    });

    client.emit(AI_QUIZ_SOCKET_EVENTS.CLIENT_TO_SERVER.GENERATE, {
      courseId: testCourse._id,
      files: realS3Files,
      settings: testSettings
    });
  });
});
```

## 🔧 Test Utilities

### Test Data Setup

```typescript
const testUser = {
  _id: "65e7f325f1f3e8eaf8e5953b",
  name: "Test",
  lastName: "Testing",
  email: "testuser@test.com",
  mobileNo: "2323232323",
  designation: "pca, hha",
  status: "active",
  gender: "other",
  roles: ["admin", "student", "author"],
  jobTitles: ["65e341cc665ad5a75909a7ec"],
  location: "65e341cc665ad5a75909a7e1",
  address: "212-12 Northern Boulevard Bayside, NY 11361"
};

const testCourse = {
  _id: "507f1f77bcf86cd799439012",
  title: "Test Course"
};

const realS3Files = [
  {
    fileName: "1741031192984_Mdl_2.pdf",
    fileType: "pdf",
    s3Url: "https://media.x-treme.services/1741031192984_Mdl_2.pdf",
    fileSize: 24376
  }
];

const testSettings = {
  questionCount: 5,
  questionTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE],
  difficulty: DIFFICULTY_LEVELS.MEDIUM,
  language: "en"
};
```

### Test Authentication Setup

```typescript
before(async () => {
  aiQuizSessionsModel = createAIQuizSessionsModel(app);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Remove existing test user if present
  const usersModel = createUsersModel(app);
  await usersModel.deleteMany({
    mobileNo: testUser.mobileNo
  });

  // Create the test user
  const userCreateRes = await app.service("users").create({ 
    ...testUser, 
    password: "testpassword" 
  });
  console.log("User created:", userCreateRes);

  // Wait for DB commit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate OTP request (mocked OTP: 111111)
  const otpRes = await app.service("forget-password").find({
    query: {
      controller: "login-with-otp",
      mobileNo: testUser.mobileNo,
      socketId: ""
    }
  });
  console.log("OTP request response:", otpRes);

  // Authenticate using OTP
  const authResponse = await app.service("authentication").create({
    strategy: "otp",
    authThrough: "mobile",
    mobileNo: testUser.mobileNo,
    otp: 111111,
    socketId: ""
  }, {});
  console.log("Authentication response:", authResponse);
  testToken = authResponse.accessToken;
  Object.assign(testUser, authResponse.user);
});
```

### Test Cleanup

```typescript
after(async () => {
  if (client) {
    client.disconnect();
  }
  await aiQuizQueue.close();
});

afterEach(async () => {
  if (client && client.connected) {
    client.disconnect();
    console.log("Test socket client disconnected in afterEach");
  }
  await aiQuizSessionsModel.deleteMany({});
  await aiQuizQueue.clean(0, 1000);
});
```

## 🚀 Performance Testing

### Load Testing

```typescript
it("should handle multiple concurrent requests", async () => {
  const concurrentRequests = 5;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(new Promise((resolve, reject) => {
      const client = Client(serverUrl, {
        query: { token: 