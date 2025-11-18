# AI Quiz Builder - Overview & Architecture

A comprehensive AI-powered quiz generation system that automatically creates questions from uploaded documents using OpenAI's ChatGPT service.

## 🏗️ Architecture Overview

The AI Quiz Builder consists of three main components:

1. **AI Quiz Processor** (`ai-quiz-processor.ts`) - Core processing engine
2. **AI Quiz Events** (`ai-quiz-events.ts`) - Socket event handlers
3. **ChatGPT Service** (`chatgpt-service.ts`) - AI provider integration

## 📁 File Structure

```
src/
├── processors/
│   └── ai-quiz-processor.ts      # Main processing engine
├── socket/
│   └── ai-quiz-events.ts         # Socket event handlers
├── services/
│   └── ai-providers/
│       └── chatgpt-service.ts    # OpenAI integration
├── utils/
│   └── question-deduplication.ts # Question deduplication logic
├── models/
│   └── ai-quiz-sessions.model.ts # Quiz session tracking
└── test/
    └── ai-quiz-builder/
        └── main-flow.test.ts     # Integration tests
```

## 🔧 Core Components

### 1. AI Quiz Processor (`ai-quiz-processor.ts`)

The main processing engine that handles the entire quiz generation workflow.

#### Key Features:
- **Queue Management**: Uses BullMQ for job processing
- **Progress Tracking**: Real-time progress updates via WebSocket
- **Error Handling**: Comprehensive error handling and recovery
- **Session Management**: Tracks quiz generation sessions

#### Main Functions:
```typescript
// Initialize the processor
initializeAIQuizProcessor(app: any)

// Add a new quiz generation job
addAIQuizJob(jobData: any): Promise<any>

// Cancel an ongoing quiz generation
cancelAIQuizJob(sessionId: string): Promise<any>
```

#### Processing Flow:
1. **Job Creation**: Client requests quiz generation
2. **File Processing**: Extract text from uploaded documents
3. **Question Generation**: Use ChatGPT to generate questions
4. **Deduplication**: Remove duplicate questions
5. **Finalization**: Return processed questions to client

### 2. Document Processor (`document-processor.ts`)

Advanced document processing utility that handles file downloads and text extraction with streaming capabilities.

#### Key Features:
- **Streaming Downloads**: Memory-efficient file downloads from S3
- **AWS SDK Integration**: Proper S3 authentication and access
- **Multi-format Support**: PDF, DOCX, and PPT processing
- **Memory Management**: Chunked processing to prevent heap issues
- **Error Recovery**: Comprehensive error handling and cleanup

#### Supported File Types:
- **PDF**: Using `pdf-parse` library with chunked reading
- **DOCX**: Using `mammoth` library for text extraction
- **PPT/PPTX**: Using `pptx-parser` library (planned)

#### Streaming Architecture:
```typescript
// Download file from S3 with streaming
private async downloadForS3(s3Url: string, fileName: string): Promise<string>

// Download hardcoded PDF for testing
private async downloadHardcodedPDF(s3Url: string, fileName: string): Promise<string>

// Extract text with memory management
private async extractTextFromPDF(filePath: string): Promise<string[]>
private async extractTextFromDOCX(filePath: string): Promise<string[]>
```

#### Memory Optimization:
- **Chunked Reading**: Files read in 64KB chunks
- **Streaming Downloads**: Direct S3 stream to temporary file
- **Text Splitting**: Content split into manageable 2000-character chunks
- **Temporary File Cleanup**: Automatic cleanup after processing

#### Error Handling:
- **S3 Access Errors**: Proper AWS SDK error handling
- **File Format Errors**: Graceful handling of unsupported formats
- **Memory Errors**: Heap memory protection through streaming
- **Network Errors**: Timeout and retry mechanisms

### 3. AI Quiz Events (`ai-quiz-events.ts`)

Handles all WebSocket events for real-time communication between client and server.

#### Supported Events:

##### Client to Server:
- `GENERATE`: Start quiz generation
- `GET_STATUS`: Get current session status
- `CANCEL`: Cancel ongoing generation
- `GET_QUEUE_STATUS`: Get queue information

##### Server to Client:
- `STARTED`: Generation started
- `PROGRESS`: Progress updates
- `COMPLETED`: Generation completed
- `ERROR`: Error notifications
- `CANCELLED`: Cancellation confirmation
- `STATUS`: Session status response
- `QUEUE_STATUS`: Queue status response

### 4. Question Deduplication (`question-deduplication.ts`)

Simplified deduplication system that removes duplicate questions within the current batch without database storage.

#### Key Features:
- **Batch-only Deduplication**: Checks for duplicates within the current question batch
- **No Database Storage**: Questions aren't saved until user confirms
- **User Control**: Client decides what gets saved to the course
- **Fast Processing**: In-memory similarity checking
- **Natural Language Processing**: Uses natural language similarity algorithms

#### How it Works:
```typescript
// Simplified deduplication - no database storage
const deduplicatedQuestions = await deduplicator.removeDuplicates(
  allQuestions // Only checks within current batch
);
```

#### Benefits:
- **User Control**: Questions only saved when user confirms
- **No Wasted Storage**: No premature database entries
- **Faster Processing**: No database queries during deduplication
- **Cleaner Architecture**: Removed unnecessary database dependency

#### Removed Components:
- **Question Cache Model**: No longer used for premature storage
- **Database Dependencies**: Removed question-cache.model.ts
- **Premature Saving**: Questions aren't saved until user decides

### 5. ChatGPT Service (`chatgpt-service.ts`)

Integration with OpenAI's ChatGPT API for question generation.

#### Features:
- **Rate Limiting**: Built-in rate limiting to respect API limits
- **Retry Logic**: Automatic retry on API failures
- **Error Handling**: Comprehensive error handling
- **Configurable**: Supports different question types and difficulty levels

## 🚀 Getting Started

### Prerequisites

1. **Environment Variables**:
```bash
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=development
```

2. **Dependencies**:
```bash
npm install bullmq openai socket.io uuid
```

### Initialization

```typescript
import { initializeAIQuizProcessor } from './processors/ai-quiz-processor';
import { registerAIQuizEvents } from './socket/ai-quiz-events';

// Initialize the processor
initializeAIQuizProcessor(app);

// Register socket events
registerAIQuizEvents(socket, app);
```

## 📊 Configuration

### AI Quiz Constants

The system uses various constants for configuration:

```typescript
// Rate Limits
MAX_CONCURRENT_JOBS: 3
CHATGPT_RATE_LIMIT: 10 // requests per minute

// File Limits
MAX_FILES_PER_REQUEST: 5
MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB

// Question Limits
MIN_QUESTIONS_PER_REQUEST: 1
MAX_QUESTIONS_PER_REQUEST: 50
MAX_TOKENS_PER_CHUNK: 2000

// Supported File Types
SUPPORTED_FILE_TYPES: ['pdf', 'docx', 'txt']
```

## 🔄 Processing Workflow

### 1. Request Validation
- Validate course ID and files
- Check rate limits
- Verify file types and sizes
- Validate user permissions

### 2. Session Creation
- Create database session record
- Generate unique session ID
- Initialize progress tracking

### 3. Queue Management
- Add job to processing queue
- Calculate queue position
- Estimate completion time

### 4. Document Processing
- Extract text from uploaded files
- Split content into manageable chunks
- Process each chunk for question generation

### 5. Question Generation
- Use ChatGPT API for each chunk
- Generate questions based on settings
- Add source information to questions

### 6. Deduplication
- Remove duplicate questions
- Ensure question quality
- Maintain question diversity

### 7. Finalization
- Update session status
- Send results to client
- Clean up temporary data

## 🧪 Testing

The system includes comprehensive tests in `test/ai-quiz-builder/main-flow.test.ts`:

```bash
# Run tests
npm test -- --grep "AI Quiz Builder"

# Run specific test
npm test -- --grep "should complete full AI Quiz generation flow"
```

### Test Coverage:
- ✅ Full generation flow
- ✅ Error handling
- ✅ Session tracking
- ✅ File processing
- ✅ Question quality validation

## 🔧 Error Handling

### Common Error Codes:
- `INVALID_INPUT`: Missing or invalid parameters
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `FILES_NOT_FOUND`: Files not found in media library
- `GENERATION_ERROR`: Processing failed
- `SESSION_NOT_FOUND`: Session not found
- `CANCEL_ERROR`: Cancellation failed

### Error Response Format:
```typescript
{
  sessionId: "session_id",
  error: "Error message",
  code: "ERROR_CODE",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

## 📈 Monitoring & Logging

### Log Levels:
- `[Backend]`: Backend initialization logs
- `[AI Quiz]`: Quiz generation logs
- `[AI Quiz Worker]`: Worker processing logs
- `[TEST]`: Test execution logs

### Key Metrics:
- Processing time per session
- Questions generated per file
- Duplicate removal rate
- Error rates and types
- Queue performance

## 🔒 Security Considerations

1. **Rate Limiting**: Prevents abuse and API cost overruns
2. **File Validation**: Ensures only supported files are processed
3. **User Authentication**: Validates user permissions
4. **Session Isolation**: Each user's sessions are isolated
5. **Error Sanitization**: Prevents sensitive information leakage

## 🚀 Performance Optimization

1. **Concurrent Processing**: Limited concurrency to prevent overload
2. **Lazy Loading**: Import heavy modules only when needed
3. **Queue Management**: Efficient job queuing and processing
4. **Progress Tracking**: Real-time updates without blocking
5. **Memory Management**: Proper cleanup of completed jobs

## 🔄 API Integration

### OpenAI API:
- Model: `text-davinci-003`
- Max tokens: Configurable per chunk
- Rate limiting: Built-in delays
- Retry logic: Automatic retry on failures

### Socket.IO Events:
- Real-time bidirectional communication
- Event-driven architecture
- Automatic reconnection handling
- Error event propagation

## 📝 Contributing

When contributing to the AI Quiz Builder:

1. **Follow the existing code style**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Handle errors gracefully**
5. **Respect rate limits**

## 🐛 Troubleshooting

### Common Issues:

1. **Queue not processing jobs**:
   - Check Redis connection
   - Verify worker initialization
   - Check job data format

2. **ChatGPT API errors**:
   - Verify API key
   - Check rate limits
   - Review API response format

3. **Socket connection issues**:
   - Check authentication
   - Verify event names
   - Review client connection

4. **File processing errors**:
   - Check file format support
   - Verify S3 URLs
   - Review file size limits

## 📄 License

This AI Quiz Builder is part of the XTCare LMS system and follows the same licensing terms.

---

## 📚 Related Documentation

- [Payload Reference](./payload-reference.md) - Complete API payload documentation
- [Database Models](./database-models.md) - Database schema and models
- [Socket Events](./socket-events.md) - WebSocket communication patterns
- [Processing Workflow](./processing-workflow.md) - Detailed process flow
- [Error Handling](./error-handling.md) - Error codes and strategies
- [Testing Guide](./testing-guide.md) - Testing approach and examples
- [Changelog](./changelog.md) - Version history and updates

For more information, contact the development team or refer to the main project documentation.
