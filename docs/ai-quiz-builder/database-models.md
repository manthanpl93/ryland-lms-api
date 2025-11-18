# AI Quiz Builder - Database Models

Complete documentation of the database models used in the AI Quiz Builder system.

## 📊 Overview

The AI Quiz Builder uses two main database models for data persistence:

1. **AI Quiz Sessions Model** - Tracks quiz generation sessions and progress
2. **Question Cache Model** - Stores normalized questions for deduplication

## 🗄️ AI Quiz Sessions Model

**Collection**: `aiQuizSessions`

**Purpose**: Tracks quiz generation sessions and their progress throughout the entire lifecycle.

### Schema Definition

```typescript
{
  userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
  courseId: { type: Schema.Types.ObjectId, ref: "courses", required: true },
  sessionId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: Object.values(AI_QUIZ_STATUS),
    default: AI_QUIZ_STATUS.PENDING
  },
  files: [{
    fileName: { type: String, required: true },
    fileType: { 
      type: String, 
      enum: SUPPORTED_FILE_TYPES, 
      required: true 
    },
    s3Url: { type: String, required: true },
    fileSize: { type: Number },
    processedAt: { type: Date },
    extractedTextLength: { type: Number },
    chunksCount: { type: Number }
  }],
  settings: {
    questionCount: { 
      type: Number, 
      default: 10,
      min: 5,
      max: 50
    },
    questionTypes: [{
      type: String,
      enum: Object.values(QUESTION_TYPES)
    }],
    difficulty: { 
      type: String, 
      enum: Object.values(DIFFICULTY_LEVELS), 
      default: DIFFICULTY_LEVELS.MEDIUM 
    },
    language: { type: String, default: "en" }
  },
  progress: {
    filesProcessed: { type: Number, default: 0 },
    totalFiles: { type: Number, default: 0 },
    questionsGenerated: { type: Number, default: 0 },
    duplicatesRemoved: { type: Number, default: 0 },
    currentStep: { type: String, default: "Queued" },
    percentage: { type: Number, default: 0 },
    estimatedCompletion: { type: Date }
  },
  error: {
    message: { type: String },
    code: { type: String },
    step: { type: String },
    timestamp: { type: Date }
  },
  queuePosition: { type: Number },
  startedAt: { type: Date },
  completedAt: { type: Date }
}
```

### Field Descriptions

#### Core Fields
- **userId**: Reference to the user who initiated the quiz generation
- **courseId**: Reference to the course for which questions are being generated
- **sessionId**: Unique identifier for the quiz generation session
- **status**: Current status of the session (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)

#### Files Array
- **fileName**: Original name of the uploaded file
- **fileType**: Type of file (pdf, docx, txt)
- **s3Url**: S3 URL where the file is stored
- **fileSize**: Size of the file in bytes
- **processedAt**: Timestamp when the file was processed
- **extractedTextLength**: Length of text extracted from the file
- **chunksCount**: Number of text chunks created from the file

#### Settings Object
- **questionCount**: Number of questions to generate (5-50, default: 10)
- **questionTypes**: Array of question types to generate
- **difficulty**: Difficulty level (easy, medium, hard)
- **language**: Language code for question generation

#### Progress Object
- **filesProcessed**: Number of files processed so far
- **totalFiles**: Total number of files to process
- **questionsGenerated**: Number of questions generated
- **duplicatesRemoved**: Number of duplicate questions removed
- **currentStep**: Current processing step
- **percentage**: Progress percentage (0-100)
- **estimatedCompletion**: Estimated completion time

#### Error Object
- **message**: Error message
- **code**: Error code
- **step**: Step where error occurred
- **timestamp**: When error occurred

#### Timing Fields
- **queuePosition**: Position in processing queue
- **startedAt**: When processing started
- **completedAt**: When processing completed

### Database Indexes

```typescript
// User's session history (for listing user's sessions)
schema.index({ userId: 1, createdAt: -1 });

// Fast session lookup
schema.index({ sessionId: 1 });

// Status-based queries (for monitoring)
schema.index({ status: 1, createdAt: -1 });
```

### Usage Examples

#### Creating a Session
```typescript
const session = await aiQuizSessionsModel.create({
  userId: "user_id",
  courseId: "course_id",
  sessionId: "unique_session_id",
  status: "PENDING",
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
  },
  progress: {
    filesProcessed: 0,
    totalFiles: 1,
    questionsGenerated: 0,
    currentStep: "Queued",
    percentage: 0
  }
});
```

#### Updating Progress
```typescript
await aiQuizSessionsModel.findOneAndUpdate(
  { sessionId: "session_id" },
  { 
    "progress.percentage": 50,
    "progress.currentStep": "Processing files...",
    "progress.filesProcessed": 1
  }
);
```

#### Finding User Sessions
```typescript
const userSessions = await aiQuizSessionsModel.find({
  userId: "user_id",
  status: { $in: ["PENDING", "PROCESSING"] }
}).sort({ createdAt: -1 });
```

## 🗄️ Question Cache Model

**Collection**: `questionCache`

**Purpose**: Stores normalized questions for deduplication and caching to prevent duplicate questions across sessions.

### Schema Definition

```typescript
{
  questionHash: { type: String, required: true, index: true },
  normalizedQuestion: { type: String, required: true },
  type: {
    type: String,
    enum: Object.values(QUESTION_TYPES),
    required: true,
  },
  courseId: { type: Schema.Types.ObjectId, ref: "courses", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
  usageCount: { type: Number, default: 1 },
  difficulty: {
    type: String,
    enum: Object.values(DIFFICULTY_LEVELS),
  },
  language: { type: String, default: "en" }
}
```

### Field Descriptions

- **questionHash**: Hash of the normalized question text (for deduplication)
- **normalizedQuestion**: Normalized question text (lowercase, trimmed)
- **type**: Type of question (multiple-choice, true-false, etc.)
- **courseId**: Reference to the course
- **userId**: Reference to the user who generated the question
- **usageCount**: How many times this question has been used
- **difficulty**: Difficulty level of the question
- **language**: Language of the question

### Database Indexes

```typescript
// Course-specific question lookup
schema.index({ courseId: 1, questionHash: 1 });

// Full-text search on questions
schema.index({ normalizedQuestion: "text" });
```

### Usage Examples

#### Storing a New Question
```typescript
await questionCacheModel.create({
  questionHash: "abc123hash",
  normalizedQuestion: "what is machine learning?",
  type: "multiple-choice",
  courseId: "course_id",
  userId: "user_id",
  difficulty: "medium",
  language: "en"
});
```

#### Checking for Duplicates
```typescript
const existingQuestion = await questionCacheModel.findOne({
  questionHash: "abc123hash",
  courseId: "course_id"
});
```

#### Full-text Search
```typescript
const similarQuestions = await questionCacheModel.find({
  $text: { $search: "machine learning" }
});
```

## 🔄 Model Relationships

### One-to-Many Relationships
- **User** → **AI Quiz Sessions** (One user can have multiple sessions)
- **Course** → **AI Quiz Sessions** (One course can have multiple sessions)
- **User** → **Question Cache** (One user can generate multiple questions)
- **Course** → **Question Cache** (One course can have multiple cached questions)

### Data Flow
1. **Session Creation**: User initiates quiz generation → Session record created
2. **Progress Tracking**: Session updated with progress information
3. **Question Generation**: Questions generated and stored in cache
4. **Deduplication**: Cache checked for existing questions
5. **Completion**: Session marked as completed with final results

## 📊 Performance Considerations

### Indexing Strategy
- **Session Lookups**: Indexed on `sessionId` for fast retrieval
- **User Queries**: Indexed on `userId` for user-specific queries
- **Status Monitoring**: Indexed on `status` for monitoring active sessions
- **Question Deduplication**: Indexed on `questionHash` for fast duplicate checks

### Data Retention
- **Sessions**: Kept for audit and debugging purposes
- **Question Cache**: Can be cleaned up periodically to prevent bloat
- **Error Logs**: Stored in session records for troubleshooting

## 🔧 Maintenance

### Regular Cleanup
```typescript
// Clean up old completed sessions (older than 30 days)
await aiQuizSessionsModel.deleteMany({
  status: "COMPLETED",
  updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
});

// Clean up unused question cache entries
await questionCacheModel.deleteMany({
  usageCount: 1,
  updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
});
```

### Monitoring Queries
```typescript
// Active sessions count
const activeSessions = await aiQuizSessionsModel.countDocuments({
  status: { $in: ["PENDING", "PROCESSING"] }
});

// Failed sessions in last 24 hours
const failedSessions = await aiQuizSessionsModel.countDocuments({
  status: "FAILED",
  updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});
```

---

**Related Documentation**:
- [Processing Workflow](./processing-workflow.md) - How sessions are processed
- [Error Handling](./error-handling.md) - Error tracking in sessions
- [Testing Guide](./testing-guide.md) - Database testing strategies
