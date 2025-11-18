import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { AI_QUIZ_LIMITS } from "./consts/ai-quiz-constants";

export class DocumentProcessor {
  private defaultChunkSize: number = AI_QUIZ_LIMITS.DEFAULT_CHUNK_SIZE;
  private readonly minChunkSize = AI_QUIZ_LIMITS.MIN_CHUNK_SIZE;
  private readonly maxChunkSize = AI_QUIZ_LIMITS.MAX_CHUNK_SIZE;

  constructor(chunkSize?: number) {
    console.log("[DocumentProcessor] Initializing with chunk size: " + (chunkSize || this.defaultChunkSize));
    if (chunkSize) {
      this.defaultChunkSize = Math.max(this.minChunkSize, Math.min(this.maxChunkSize, chunkSize));
      console.log("[DocumentProcessor] Chunk size adjusted to: " + this.defaultChunkSize);
    }
  }

  // Process a file and extract text using memory-efficient streaming approach
  async processFile(file: any, customChunkSize?: number): Promise<ProcessedFile> {
    const { fileType, fileName, s3Url } = file;
    const chunkSize = customChunkSize || this.defaultChunkSize;

    console.log("[DocumentProcessor] Starting file processing:", {
      fileName,
      fileType,
      s3Url,
      chunkSize
    });
    
    console.log("[DocumentProcessor] DEBUG: File object received:", JSON.stringify(file, null, 2));
    console.log("[DocumentProcessor] DEBUG: s3Url type:", typeof s3Url);
    console.log("[DocumentProcessor] DEBUG: s3Url value:", s3Url);

    try {
      // Download file to temporary location for processing
      console.log("[DocumentProcessor] Downloading file: " + fileName);
      const tempFilePath = await this.downloadForS3(s3Url, fileName);
      console.log("[DocumentProcessor] File downloaded to: " + tempFilePath);

      try {
        // Process based on file type using appropriate libraries
        let chunks: string[] = [];

        console.log("[DocumentProcessor] Extracting text from " + fileType + " file");
        switch (fileType.toLowerCase()) {
        case "pdf":
          chunks = await this.extractTextFromPDF(tempFilePath, chunkSize);
          break;
        case "docx":
          chunks = await this.extractTextFromDOCX(tempFilePath, chunkSize);
          break;
        default:
          throw new Error("Unsupported file type: " + fileType);
        }

        console.log("[DocumentProcessor] Text extraction completed. Generated " + chunks.length + " chunks");
        
        // Log chunk statistics
        if (chunks.length > 0) {
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const avgLength = Math.round(totalLength / chunks.length);
          console.log("[DocumentProcessor] Chunk statistics:", {
            totalChunks: chunks.length,
            totalCharacters: totalLength,
            averageChunkLength: avgLength,
            minChunkLength: Math.min(...chunks.map(c => c.length)),
            maxChunkLength: Math.max(...chunks.map(c => c.length))
          });
        }

        return { chunks };
      } finally {
        // Clean up temporary file
        console.log("[DocumentProcessor] Cleaning up temporary file: " + tempFilePath);
        this.cleanupTempFile(tempFilePath);
      }
    } catch (error: any) {
      console.error("[DocumentProcessor] Failed to process file " + fileName + ":", error);
      throw new Error("Failed to process file " + fileName + ": " + error.message);
    }
  }

  // Download file from CloudFront URL to temporary location using streaming

  private async downloadForS3(
    cloudFrontUrl: string,
    fileName: string
  ): Promise<string> {
    console.log("[DocumentProcessor] Starting CloudFront download for: " + fileName);
    console.log("[DocumentProcessor] CloudFront URL received:", cloudFrontUrl);
    
    try {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, "doc_" + Date.now() + "_" + fileName);

      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempFilePath);

        console.log("[DocumentProcessor] Creating HTTP download stream from CloudFront");
        console.log("[DocumentProcessor] DEBUG: Making HTTP request to:", cloudFrontUrl);
        
        axios({
          method: "GET",
          url: cloudFrontUrl,
          responseType: "stream",
          timeout: 300000, // 5 minutes timeout
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        })
          .then((response: any) => {
            console.log("[DocumentProcessor] HTTP response received:", {
              status: response.status,
              statusText: response.statusText,
              contentLength: response.headers["content-length"]
            });

            response.data.pipe(writeStream);

            writeStream.on("finish", () => {
              console.log("[DocumentProcessor] CloudFront download completed: " + tempFilePath);
              resolve(tempFilePath);
            });

            writeStream.on("error", (error: any) => {
              console.error("[DocumentProcessor] CloudFront download write stream error:", error);
              reject(error);
            });

            response.data.on("error", (error: any) => {
              console.error("[DocumentProcessor] CloudFront download read stream error:", error);
              reject(error);
            });
          })
          .catch((error: any) => {
            console.error("[DocumentProcessor] CloudFront download HTTP error:", error);
            console.error("[DocumentProcessor] DEBUG: Error details:", {
              message: error.message,
              status: error.response?.status,
              statusText: error.response?.statusText,
              headers: error.response?.headers,
              data: error.response?.data
            });
            reject(error);
          });
      });
    } catch (error: any) {
      console.error("[DocumentProcessor] CloudFront download failed:", error);
      throw new Error("Failed to download file: " + error.message);
    }
  }

  // Download hardcoded PDF for testing
  private async downloadHardcodedPDF(
    s3Url: string,
    fileName: string
  ): Promise<string> {
    console.log("[DocumentProcessor] Starting hardcoded PDF download for: " + fileName);
    try {
      const hardcodedPdfUrl =
        "https://drive.usercontent.google.com/download?id=1R7FXzJvQQcqauECD-mwCEXLEXA_uXfcY&export=download&authuser=0";

      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, "doc_" + Date.now() + "_" + fileName);

      console.log("[DocumentProcessor] Downloading from hardcoded URL: " + hardcodedPdfUrl);
      console.log("[DocumentProcessor] Temporary file path: " + tempFilePath);

      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempFilePath);

        // Use axios to download the hardcoded PDF URL
        const response = axios({
          method: "GET",
          url: hardcodedPdfUrl,
          responseType: "stream",
          timeout: 300000, // 5 minutes timeout
        });

        response
          .then((res: any) => {
            console.log("[DocumentProcessor] HTTP response received:", {
              status: res.status,
              statusText: res.statusText,
              contentLength: res.headers["content-length"]
            });

            res.data.pipe(writeStream);

            writeStream.on("finish", () => {
              console.log("[DocumentProcessor] Hardcoded PDF download completed: " + tempFilePath);
              resolve(tempFilePath);
            });

            writeStream.on("error", (error: any) => {
              console.error("[DocumentProcessor] Hardcoded PDF download write stream error:", error);
              reject(error);
            });

            res.data.on("error", (error: any) => {
              console.error("[DocumentProcessor] Hardcoded PDF download read stream error:", error);
              reject(error);
            });
          })
          .catch((error: any) => {
            console.error("[DocumentProcessor] Hardcoded PDF download HTTP error:", error);
            reject(error);
          });
      });
    } catch (error: any) {
      console.error("[DocumentProcessor] Hardcoded PDF download failed:", error);
      throw new Error("Failed to download hardcoded PDF: " + error.message);
    }
  }

  // Extract text from PDF using pdf-parse library
  private async extractTextFromPDF(filePath: string, chunkSize: number): Promise<string[]> {
    console.log("[DocumentProcessor] Starting PDF text extraction: " + filePath);
    try {
      // Read file in smaller chunks to prevent memory issues
      console.log("[DocumentProcessor] Reading PDF file in chunks");
      const dataBuffer = await this.readFileInChunks(filePath);
      console.log("[DocumentProcessor] PDF file read, buffer size: " + dataBuffer.length + " bytes");

      console.log("[DocumentProcessor] Parsing PDF content");
      const data = await pdf(dataBuffer);
      console.log("[DocumentProcessor] PDF parsing completed:", {
        pages: data.numpages,
        textLength: data.text.length,
        info: data.info
      });

      // Split text into chunks to avoid memory issues
      console.log("[DocumentProcessor] Splitting PDF text into chunks of size: " + chunkSize);
      const chunks = this.splitTextIntoChunks(data.text, chunkSize);

      console.log("[DocumentProcessor] PDF text extraction completed. Generated " + chunks.length + " chunks");
      return chunks;
    } catch (error: any) {
      console.error("[DocumentProcessor] PDF text extraction failed:", error);
      throw new Error("PDF text extraction failed: " + error.message);
    }
  }

  // Read file in chunks to prevent memory issues
  private async readFileInChunks(filePath: string): Promise<Buffer> {
    console.log("[DocumentProcessor] Starting file read in chunks: " + filePath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytesRead = 0;
      let chunkCount = 0;

      const readStream = fs.createReadStream(filePath, {
        highWaterMark: 64 * 1024, // 64KB chunks for better memory management
      });

      readStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytesRead += chunk.length;
        chunkCount++;

        // If we're accumulating too much data, process it in smaller batches
        if (chunks.length > 100) {
          // Process every 100 chunks (6.4MB)
          const currentBuffer = Buffer.concat(chunks);
          chunks.length = 0; // Clear the array
          chunks.push(currentBuffer); // Keep the concatenated buffer
          console.log("[DocumentProcessor] Processed " + chunkCount + " chunks, total bytes: " + totalBytesRead);
        }
      });

      readStream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        console.log("[DocumentProcessor] File read completed:", {
          totalChunks: chunkCount,
          totalBytes: totalBytesRead,
          finalBufferSize: buffer.length
        });
        resolve(buffer);
      });

      readStream.on("error", (error) => {
        console.error("[DocumentProcessor] File read error:", error);
        reject(error);
      });
    });
  }

  // Extract text from DOCX using mammoth library
  private async extractTextFromDOCX(filePath: string, chunkSize: number): Promise<string[]> {
    console.log("[DocumentProcessor] Starting DOCX text extraction: " + filePath);
    try {
      console.log("[DocumentProcessor] Using mammoth to extract raw text");
      const result = await mammoth.extractRawText({ path: filePath });
      
      console.log("[DocumentProcessor] DOCX text extraction completed:", {
        textLength: result.value.length,
        messages: result.messages
      });

      // Split text into chunks to avoid memory issues
      console.log("[DocumentProcessor] Splitting DOCX text into chunks of size: " + chunkSize);
      const chunks = this.splitTextIntoChunks(result.value, chunkSize);

      console.log("[DocumentProcessor] DOCX text extraction completed. Generated " + chunks.length + " chunks");
      return chunks;
    } catch (error: any) {
      console.error("[DocumentProcessor] DOCX text extraction failed:", error);
      throw new Error("DOCX text extraction failed: " + error.message);
    }
  }

  // Split text into manageable chunks to prevent memory issues
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    console.log("[DocumentProcessor] Starting text chunking:", {
      textLength: text.length,
      maxChunkSize
    });

    if (!text || text.trim().length === 0) {
      console.log("[DocumentProcessor] Empty text provided, returning empty chunks array");
      return [];
    }

    const chunks: string[] = [];
    
    // First, split by paragraphs to maintain context
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    console.log("[DocumentProcessor] Split text into " + paragraphs.length + " paragraphs");
    
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // If this paragraph alone exceeds the chunk size, split it by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        
        // Split long paragraph by sentences
        const sentences = trimmedParagraph
          .split(/[.!?]+/)
          .filter(sentence => sentence.trim().length > 0);
        
        console.log("[DocumentProcessor] Long paragraph split into " + sentences.length + " sentences");
        
        let sentenceChunk = "";
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          
          if (sentenceChunk.length + trimmedSentence.length > maxChunkSize && sentenceChunk.length > 0) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = trimmedSentence;
          } else {
            sentenceChunk += (sentenceChunk.length > 0 ? " " : "") + trimmedSentence;
          }
        }
        
        // Add remaining sentence chunk
        if (sentenceChunk.trim().length > 0) {
          chunks.push(sentenceChunk.trim());
        }
      } else {
        // Check if adding this paragraph would exceed chunk size
        if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmedParagraph;
        } else {
          currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + trimmedParagraph;
        }
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // If no chunks were created (text is shorter than maxChunkSize), return the whole text
    if (chunks.length === 0 && text.trim().length > 0) {
      console.log("[DocumentProcessor] Text is shorter than maxChunkSize, creating single chunk");
      chunks.push(text.trim());
    }

    // Filter out chunks that are too small (less than 100 characters)
    const filteredChunks = chunks.filter(chunk => chunk.length >= AI_QUIZ_LIMITS.MIN_CHUNK_LENGTH);
    
    console.log("[DocumentProcessor] Text chunking completed:", {
      originalChunks: chunks.length,
      filteredChunks: filteredChunks.length,
      minChunkLength: AI_QUIZ_LIMITS.MIN_CHUNK_LENGTH,
      discardedChunks: chunks.length - filteredChunks.length
    });

    return filteredChunks;
  }

  // Clean up temporary file
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("[DocumentProcessor] Temporary file cleaned up: " + filePath);
      } else {
        console.log("[DocumentProcessor] Temporary file not found for cleanup: " + filePath);
      }
    } catch (error) {
      console.error("[DocumentProcessor] Failed to cleanup temporary file " + filePath + ":", error);
      // Silent cleanup error
    }
  }
}

interface ProcessedFile {
  chunks: string[];
}
