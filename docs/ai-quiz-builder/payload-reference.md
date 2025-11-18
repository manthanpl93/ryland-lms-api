# AI Quiz Builder - Payload Reference

Complete documentation of all request and response payloads used in the AI Quiz Builder system.

## 📋 Table of Contents

- [Client to Server Payloads](#client-to-server-payloads)
- [Server to Client Payloads](#server-to-client-payloads)
- [Job Queue Payloads](#job-queue-payloads)
- [Error Payloads](#error-payloads)
- [Validation Rules](#validation-rules)
- [Examples](#examples)

## 🔄 Client to Server Payloads

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
```json
{
  "courseId": "507f1f77bcf86cd799439012",
  "files": [
    {
      "fileName": "module_2.pdf",
      "fileType": "pdf",
      "s3Url": "https://media.x-treme.services/module_2.pdf",
      "fileSize": 24376
    }
  ],
  "settings": {
    "questionCount": 10,
    "questionTypes": ["multiple-choice", "true-false"],
    "difficulty": "medium",
    "language": "en"
  }
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
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

## 📤 Server to Client Payloads

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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "AI quiz generation started successfully",
  "queuePosition": 2,
  "estimatedWaitTime": 240,
  "totalFiles": 1,
  "settings": {
    "questionCount": 10,
    "questionTypes": ["multiple-choice", "true-false"],
    "difficulty": "medium",
    "language": "en"
  }
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "step": "Processing module_2.pdf",
  "percentage": 45,
  "message": "Extracting text from module_2.pdf...",
  "status": "PROCESSING"
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "questions": [
    {
      "id": "q1-abc123",
      "question": "What is the primary purpose of machine learning?",
      "type": "multiple-choice",
      "options": [
        "To replace human intelligence",
        "To enable computers to learn from data",
        "To create faster processors",
        "To improve internet speed"
      ],
      "correctAnswer": "To enable computers to learn from data",
      "sourceFile": "module_2.pdf",
      "sourceChunk": 1
    }
  ],
  "totalGenerated": 15,
  "finalCount": 10,
  "duplicatesRemoved": 5,
  "processingTime": 180
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "progress": {
    "filesProcessed": 1,
    "totalFiles": 2,
    "questionsGenerated": 5,
    "duplicatesRemoved": 2,
    "currentStep": "Generating questions from module_2.pdf",
    "percentage": 60,
    "timeElapsed": 120,
    "timeRemaining": 80
  },
  "files": [
    {
      "fileName": "module_2.pdf",
      "fileType": "pdf",
      "processed": true,
      "extractedTextLength": 15000,
      "chunksCount": 3
    }
  ]
}
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
```json
{
  "global": {
    "totalJobs": 15,
    "activeJobs": 3,
    "queuedJobs": 12,
    "averageWaitTime": 300
  },
  "userSessions": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "PENDING",
      "progress": {
        "percentage": 0,
        "currentStep": "Queued"
      },
      "queuePosition": 2,
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "canCreateNew": true,
  "rateLimitInfo": {
    "requestsRemaining": 5,
    "resetTime": "2024-01-01T11:00:00.000Z"
  }
}
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
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Quiz generation cancelled successfully",
  "timestamp": "2024-01-01T10:30:00.000Z"
}
```

## 🔧 Job Queue Payloads

### AI Quiz Job Data

**Description**: Internal job payload for processing queue

**Payload**:
```typescript
{
  sessionId: string,      // Unique session ID
  userId: string,         // User ID
  courseId: string,       // Course ID
  files: [               // Validated files
    {
      fileName: string,
      fileType: string,
      s3Url: string,
      size: number
    }
  ],
  settings: {            // Quiz settings
    questionCount: number,
    questionTypes: string[],
    difficulty: string,
    language: string
  },
  socketId: string       // Socket ID for real-time updates
}
```

**Example**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "65e7f325f1f3e8eaf8e5953b",
  "courseId": "507f1f77bcf86cd799439012",
  "files": [
    {
      "fileName": "module_2.pdf",
      "fileType": "pdf",
      "s3Url": "https://media.x-treme.services/module_2.pdf",
      "size": 24376
    }
  ],
  "settings": {
    "questionCount": 10,
    "questionTypes": ["multiple-choice", "true-false"],
    "difficulty": "medium",
    "language": "en"
  },
  "socketId": "socket_123456"
}
```

## ❌ Error Payloads

### Error Response Structure

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

### Common Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `INVALID_INPUT` | Missing or invalid parameters | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `FILES_NOT_FOUND` | Files not found in media library | 404 |
| `GENERATION_ERROR` | Processing failed | 500 |
| `SESSION_NOT_FOUND` | Session not found | 404 |
| `CANCEL_ERROR` | Cancellation failed | 500 |
| `STATUS_ERROR` | Status retrieval failed | 500 |
| `QUEUE_STATUS_ERROR` | Queue status failed | 500 |

**Example Error Responses**:

```json
// Invalid Input
{
  "error": "Course ID is required",
  "code": "INVALID_INPUT"
}

// Rate Limit Exceeded
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300
}

// Files Not Found
{
  "error": "No valid files found in media library",
  "code": "FILES_NOT_FOUND"
}

// Generation Error
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Failed to process document content",
  "code": "GENERATION_ERROR",
  "timestamp": "2024-01-01T10:30:00.000Z"
}
```

## ✅ Validation Rules

### File Validation
- **Required fields**: `fileName`, `fileType`, `s3Url`
- **Supported types**: `pdf`, `docx`, `txt`
- **Max files per request**: 5
- **Max file size**: 10MB
- **Must exist in media library**

### Settings Validation
- **questionCount**: 5-50 (default: 10)
- **questionTypes**: Array of valid types
- **difficulty**: `easy`, `medium`, `hard` (default: `medium`)
- **language**: Language code (default: `en`)

### Session Validation
- **sessionId**: Required for status/cancel operations
- **User ownership**: Users can only access their own sessions
- **Status checks**: Cannot cancel completed/cancelled sessions

## 📝 Examples

### Complete Generation Flow

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

### Error Handling

```typescript
// Listen for errors
socket.on('aiQuizError', (data) => {
  console.error('Error:', data.error);
  console.error('Code:', data.code);
  
  if (data.code === 'RATE_LIMIT_EXCEEDED') {
    console.log('Retry after:', data.retryAfter + ' seconds');
  }
});
```

### Status Checking

```typescript
// Check session status
socket.emit('aiQuizGetStatus', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});

socket.on('aiQuizStatus', (data) => {
  console.log('Status:', data.status);
  console.log('Progress:', data.progress.percentage + '%');
});
```

---

**Note**: All timestamps are in ISO 8601 format (UTC). All IDs are strings unless specified otherwise. File sizes are in bytes.
