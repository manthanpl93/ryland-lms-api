# AI Quiz Builder - Socket Events

Complete documentation of WebSocket events and communication patterns used in the AI Quiz Builder system.

## 🔌 Overview

The AI Quiz Builder uses Socket.IO for real-time bidirectional communication between the client and server. This enables:

- **Real-time progress updates** during quiz generation
- **Immediate error notifications** when issues occur
- **Live queue status** monitoring
- **Session management** without polling

## 📡 Event Constants

```typescript
export const AI_QUIZ_SOCKET_EVENTS = {
  // Client to Server Events (Frontend sends these to Backend)
  CLIENT_TO_SERVER: {
    GENERATE: 'aiQuizGenerate',
    GET_STATUS: 'aiQuizGetStatus', 
    CANCEL: 'aiQuizCancel',
    GET_QUEUE_STATUS: 'aiQuizQueueStatus',
  },
  
  // Server to Client Events (Backend sends these to Frontend)
  SERVER_TO_CLIENT: {
    STARTED: 'aiQuizStarted',
    PROGRESS: 'aiQuizProgress',
    STATUS: 'aiQuizStatus',
    COMPLETED: 'aiQuizCompleted',
    CANCELLED: 'aiQuizCancelled',
    FAILED: 'aiQuizFailed',
    ERROR: 'aiQuizError',
    QUEUE_STATUS: 'aiQuizQueueStatus',
  }
} as const;
```

## 🔄 Client to Server Events

### 1. Generate Quiz Request

**Event**: `aiQuizGenerate`

**Description**: Initiates AI quiz generation from uploaded files

**Payload**:
```typescript
{
  courseId: string,           // Required: Course ID
  files: [                    // Required: Array of files
    {
      fileName: string,       // File name (e.g., "document.pdf")
      fileType: string,       // File type (pdf, docx, txt)
      s3Url: string,         // S3 URL of the file
      fileSize: number       // File size in bytes
    }
  ],
  settings?: {               // Optional: Quiz generation settings
    questionCount?: number,   // Number of questions (5-50, default: 10)
    questionTypes?: string[], // Array of question types
    difficulty?: string,      // Easy, medium, hard (default: medium)
    language?: string        // Language code (default: "en")
  }
}
```

**Example**:
```typescript
socket.emit('aiQuizGenerate', {
  courseId: "507f1f77bcf86cd799439012",
  files: [
    {
      fileName: "module_2.pdf",
      fileType: "pdf",
      s3Url: "https://media.x-treme.services/module_2.pdf",
      fileSize: 24376
    }
  ],
  settings: {
    questionCount: 10,
    questionTypes: ["multiple-choice", "true-false"],
    difficulty: "medium",
    language: "en"
  }
});
```

### 2. Get Status Request

**Event**: `aiQuizGetStatus`

**Description**: Retrieves current status of a quiz generation session

**Payload**:
```typescript
{
  sessionId: string          // Required: Session ID to check
}
```

**Example**:
```typescript
socket.emit('aiQuizGetStatus', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});
```

### 3. Cancel Generation Request

**Event**: `aiQuizCancel`

**Description**: Cancels an ongoing quiz generation session

**Payload**:
```typescript
{
  sessionId: string          // Required: Session ID to cancel
}
```

**Example**:
```typescript
socket.emit('aiQuizCancel', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});
```

### 4. Get Queue Status Request

**Event**: `aiQuizGetQueueStatus`

**Description**: Retrieves current queue status and user's active sessions

**Payload**:
```typescript
{
  // No payload required - uses authenticated user
}
```

**Example**:
```typescript
socket.emit('aiQuizGetQueueStatus');
```

## 📤 Server to Client Events

### 1. Generation Started Response

**Event**: `aiQuizStarted`

**Description**: Confirms quiz generation has started and provides session details

**Payload**:
```typescript
{
  sessionId: string,         // Unique session ID
  status: string,           // "PENDING"
  message: string,          // Success message
  queuePosition: number,    // Position in queue
  estimatedWaitTime: number, // Estimated wait time in seconds
  totalFiles: number,       // Number of files to process
  settings: {              // Applied settings
    questionCount: number,
    questionTypes: string[],
    difficulty: string,
    language: string
  }
}
```

**Example**:
```typescript
socket.on('aiQuizStarted', (data) => {
  console.log('Session ID:', data.sessionId);
  console.log('Queue Position:', data.queuePosition);
  console.log('Estimated Wait Time:', data.estimatedWaitTime + ' seconds');
});
```

### 2. Progress Update Response

**Event**: `aiQuizProgress`

**Description**: Real-time progress updates during quiz generation

**Payload**:
```typescript
{
  sessionId: string,        // Session ID
  step: string,            // Current processing step
  percentage: number,      // Progress percentage (0-100)
  message: string,         // Progress message
  status: string          // Current status
}
```

**Example**:
```typescript
socket.on('aiQuizProgress', (data) => {
  console.log('Progress:', data.percentage + '%');
  console.log('Current Step:', data.step);
  console.log('Message:', data.message);
});
```

### 3. Generation Completed Response

**Event**: `aiQuizCompleted`

**Description**: Final response with generated questions

**Payload**:
```typescript
{
  sessionId: string,       // Session ID
  questions: [            // Array of generated questions
    {
      id: string,         // Unique question ID
      question: string,   // Question text
      type: string,       // Question type
      options: string[],  // Answer options
      correctAnswer: string, // Correct answer
      sourceFile: string, // Source file name
      sourceChunk: number // Source text chunk
    }
  ],
  totalGenerated: number,    // Total questions generated
  finalCount: number,       // Final question count
  duplicatesRemoved: number, // Number of duplicates removed
  processingTime: number    // Processing time in seconds
}
```

**Example**:
```typescript
socket.on('aiQuizCompleted', (data) => {
  console.log('Questions generated:', data.questions.length);
  console.log('Processing time:', data.processingTime + 's');
  console.log('Duplicates removed:', data.duplicatesRemoved);
});
```

### 4. Status Response

**Event**: `aiQuizStatus`

**Description**: Detailed status information for a session

**Payload**:
```typescript
{
  sessionId: string,       // Session ID
  status: string,         // Current status
  progress: {            // Progress information
    filesProcessed: number,
    totalFiles: number,
    questionsGenerated: number,
    duplicatesRemoved: number,
    currentStep: string,
    percentage: number,
    timeElapsed: number,    // Seconds elapsed
    timeRemaining: number   // Seconds remaining
  },
  error?: {              // Error information (if any)
    message: string,
    code: string,
    step: string,
    timestamp: string
  },
  files: [              // File processing status
    {
      fileName: string,
      fileType: string,
      processed: boolean,
      extractedTextLength: number,
      chunksCount: number
    }
  ],
  queuePosition?: number  // Queue position (if pending)
}
```

**Example**:
```typescript
socket.on('aiQuizStatus', (data) => {
  console.log('Status:', data.status);
  console.log('Progress:', data.progress.percentage + '%');
  console.log('Time Elapsed:', data.progress.timeElapsed + 's');
  console.log('Time Remaining:', data.progress.timeRemaining + 's');
});
```

### 5. Queue Status Response

**Event**: `aiQuizQueueStatus`

**Description**: Current queue status and user session information

**Payload**:
```typescript
{
  global: {              // Global queue status
    totalJobs: number,
    activeJobs: number,
    queuedJobs: number,
    averageWaitTime: number
  },
  userSessions: [       // User's active sessions
    {
      sessionId: string,
      status: string,
      progress: {
        percentage: number,
        currentStep: string
      },
      queuePosition: number,
      createdAt: string
    }
  ],
  canCreateNew: boolean,  // Whether user can create new session
  rateLimitInfo: {       // Rate limit information
    requestsRemaining: number,
    resetTime: string
  }
}
```

**Example**:
```typescript
socket.on('aiQuizQueueStatus', (data) => {
  console.log('Global Jobs:', data.global.totalJobs);
  console.log('Active Jobs:', data.global.activeJobs);
  console.log('Can Create New:', data.canCreateNew);
  console.log('Rate Limit Remaining:', data.rateLimitInfo.requestsRemaining);
});
```

### 6. Cancellation Response

**Event**: `aiQuizCancelled`

**Description**: Confirms session cancellation

**Payload**:
```typescript
{
  sessionId: string,     // Session ID
  message: string,       // Cancellation message
  timestamp: string      // Cancellation timestamp
}
```

**Example**:
```typescript
socket.on('aiQuizCancelled', (data) => {
  console.log('Session cancelled:', data.sessionId);
  console.log('Message:', data.message);
});
```

### 7. Error Response

**Event**: `aiQuizError`

**Description**: Error notifications for various failure scenarios

**Payload**:
```typescript
{
  sessionId?: string,     // Session ID (if available)
  error: string,         // Error message
  code: string,          // Error code
  timestamp?: string,    // Error timestamp
  retryAfter?: number    // Retry after seconds (for rate limits)
}
```

**Example**:
```typescript
socket.on('aiQuizError', (data) => {
  console.error('Error:', data.error);
  console.error('Code:', data.code);
  
  if (data.code === 'RATE_LIMIT_EXCEEDED') {
    console.log('Retry after:', data.retryAfter + ' seconds');
  }
});
```

## 🔄 Complete Event Flow

### 1. Quiz Generation Flow

```typescript
// 1. Client requests generation
socket.emit('aiQuizGenerate', {
  courseId: "507f1f77bcf86cd799439012",
  files: [
    {
      fileName: "module_2.pdf",
      fileType: "pdf",
      s3Url: "https://media.x-treme.services/module_2.pdf",
      fileSize: 24376
    }
  ],
  settings: {
    questionCount: 10,
    questionTypes: ["multiple-choice", "true-false"],
    difficulty: "medium",
    language: "en"
  }
});

// 2. Server responds with session info
socket.on('aiQuizStarted', (data) => {
  console.log('Session ID:', data.sessionId);
  console.log('Queue Position:', data.queuePosition);
});

// 3. Progress updates
socket.on('aiQuizProgress', (data) => {
  console.log('Progress:', data.percentage + '%');
  console.log('Current Step:', data.step);
});

// 4. Generation completed
socket.on('aiQuizCompleted', (data) => {
  console.log('Questions generated:', data.questions.length);
  console.log('Processing time:', data.processingTime + 's');
});
```

### 2. Status Monitoring Flow

```typescript
// 1. Check session status
socket.emit('aiQuizGetStatus', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});

// 2. Receive status response
socket.on('aiQuizStatus', (data) => {
  console.log('Status:', data.status);
  console.log('Progress:', data.progress.percentage + '%');
  console.log('Time Elapsed:', data.progress.timeElapsed + 's');
});
```

### 3. Queue Monitoring Flow

```typescript
// 1. Get queue status
socket.emit('aiQuizGetQueueStatus');

// 2. Receive queue information
socket.on('aiQuizQueueStatus', (data) => {
  console.log('Global Jobs:', data.global.totalJobs);
  console.log('Active Jobs:', data.global.activeJobs);
  console.log('User Sessions:', data.userSessions.length);
});
```

### 4. Cancellation Flow

```typescript
// 1. Cancel session
socket.emit('aiQuizCancel', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});

// 2. Receive cancellation confirmation
socket.on('aiQuizCancelled', (data) => {
  console.log('Session cancelled:', data.sessionId);
  console.log('Message:', data.message);
});
```

## 🔧 Error Handling

### Error Event Handling

```typescript
// Listen for all error events
socket.on('aiQuizError', (data) => {
  console.error('Error:', data.error);
  console.error('Code:', data.code);
  
  // Handle specific error types
  switch (data.code) {
    case 'RATE_LIMIT_EXCEEDED':
      console.log('Retry after:', data.retryAfter + ' seconds');
      break;
    case 'FILES_NOT_FOUND':
      console.log('Files not found in media library');
      break;
    case 'GENERATION_ERROR':
      console.log('Processing failed');
      break;
    default:
      console.log('Unknown error occurred');
  }
});
```

### Connection Error Handling

```typescript
// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});
```

## 🚀 Best Practices

### 1. Event Listening Setup

```typescript
// Set up all event listeners before emitting any events
function setupAIQuizListeners(socket) {
  // Progress updates
  socket.on('aiQuizProgress', handleProgress);
  
  // Completion
  socket.on('aiQuizCompleted', handleCompletion);
  
  // Errors
  socket.on('aiQuizError', handleError);
  
  // Status updates
  socket.on('aiQuizStatus', handleStatus);
  
  // Queue updates
  socket.on('aiQuizQueueStatus', handleQueueStatus);
}
```

### 2. Session Management

```typescript
// Store session ID for later use
let currentSessionId = null;

socket.on('aiQuizStarted', (data) => {
  currentSessionId = data.sessionId;
  console.log('Session started:', currentSessionId);
});

// Use stored session ID for status checks
function checkSessionStatus() {
  if (currentSessionId) {
    socket.emit('aiQuizGetStatus', { sessionId: currentSessionId });
  }
}
```

### 3. Rate Limiting

```typescript
// Check queue status before starting new generation
socket.on('aiQuizQueueStatus', (data) => {
  if (!data.canCreateNew) {
    console.log('Rate limit reached, cannot create new session');
    return;
  }
  
  // Proceed with quiz generation
  startQuizGeneration();
});
```

## 📊 Monitoring and Debugging

### Event Logging

```typescript
// Log all events for debugging
const originalEmit = socket.emit;
socket.emit = function(event, data) {
  console.log('Emitting:', event, data);
  return originalEmit.apply(this, arguments);
};

const originalOn = socket.on;
socket.on = function(event, handler) {
  console.log('Listening for:', event);
  return originalOn.apply(this, arguments);
};
```

### Performance Monitoring

```typescript
// Track event timing
const eventTimings = {};

socket.on('aiQuizStarted', (data) => {
  eventTimings.start = Date.now();
});

socket.on('aiQuizCompleted', (data) => {
  const duration = Date.now() - eventTimings.start;
  console.log('Total processing time:', duration + 'ms');
});
```

---

**Related Documentation**:
- [Payload Reference](./payload-reference.md) - Complete payload documentation
- [Processing Workflow](./processing-workflow.md) - How events trigger processing
- [Error Handling](./error-handling.md) - Error codes and handling
- [Testing Guide](./testing-guide.md) - Socket testing strategies
