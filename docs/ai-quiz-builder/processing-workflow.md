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
