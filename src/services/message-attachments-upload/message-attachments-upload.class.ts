import { Service } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";
import { generatePresignedUrl } from "../../utils/upload-helper";
import axios from "axios";
import sharp from "sharp";
import * as AWS from "aws-sdk";
import configuration from "@feathersjs/configuration";

const { aws } = configuration()();

// Configure AWS S3
AWS.config.update({ region: aws.s3BucketRegion });
const s3 = new AWS.S3();

// Attachment limits and validation
export const ATTACHMENT_LIMITS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"],
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic"]
  },
  document: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ],
    extensions: ["pdf", "docx", "xlsx"]
  }
};

export class MessageAttachmentsUpload extends Service {
  app: Application;

  constructor(app: Application) {
    super();
    this.app = app;
  }

  /**
   * Create method handles different controller actions
   */
  async create(data: any, params?: Params): Promise<any> {
    if (data.controller) {
      switch (data.controller) {
      case "createPresignedUrl":
        return this.createPresignedUrl(data, params);
      case "extractImageMetadata":
        return this.extractImageMetadata(data, params);
      case "generateThumbnail":
        return this.generateThumbnail(data, params);
      default:
        throw new BadRequest(`Unknown controller: ${data.controller}`);
      }
    }
    throw new BadRequest("Controller action required");
  }

  /**
   * Create presigned URL for file upload
   */
  private async createPresignedUrl(data: any, params?: Params): Promise<any> {
    const { filename, fileSize, mimeType, attachmentType } = data;

    if (!filename || !fileSize || !mimeType || !attachmentType) {
      throw new BadRequest("Missing required fields: filename, fileSize, mimeType, attachmentType");
    }

    // Validate attachment type
    if (attachmentType !== "image" && attachmentType !== "document") {
      throw new BadRequest("Invalid attachment type. Must be 'image' or 'document'");
    }

    const limits = ATTACHMENT_LIMITS[attachmentType];

    // Validate file size
    if (fileSize > limits.maxSize) {
      const maxSizeMB = limits.maxSize / (1024 * 1024);
      throw new BadRequest(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${attachmentType}`
      );
    }

    // Validate MIME type
    if (!limits.allowedTypes.includes(mimeType)) {
      throw new BadRequest(
        `Invalid file type. Allowed types for ${attachmentType}: ${limits.extensions.join(", ")}`
      );
    }

    // Validate file extension
    const extension = filename.split(".").pop()?.toLowerCase();
    if (!extension || !limits.extensions.includes(extension)) {
      throw new BadRequest(
        `Invalid file extension. Allowed extensions: ${limits.extensions.join(", ")}`
      );
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.]/g, "_");
    
    // Create S3 path with user ID and timestamp
    const userId = params?.user?._id;
    const timestamp = Date.now();
    const s3Path = `message-attachments/${userId}/${timestamp}-${sanitizedFilename}`;

    // Generate presigned URL
    const urlData = await generatePresignedUrl(s3Path);

    return {
      signedUrl: urlData.signedUrl,
      objectUrl: urlData.objectUrl,
      metadata: {
        filename: sanitizedFilename,
        size: fileSize,
        mimeType,
        type: attachmentType
      }
    };
  }

  /**
   * Extract image metadata (dimensions)
   */
  private async extractImageMetadata(data: any, params?: Params): Promise<any> {
    const { url } = data;

    if (!url) {
      throw new BadRequest("Missing required field: url");
    }

    try {
      // Download image from S3 URL
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000
      });

      // Extract metadata using Sharp
      const imageBuffer = Buffer.from(response.data);
      const metadata = await sharp(imageBuffer).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length,
        format: metadata.format
      };
    } catch (error: any) {
      throw new BadRequest(`Failed to extract image metadata: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail for image
   */
  async generateThumbnail(data: any): Promise<any> {
    const { url, maxWidth = 300, maxHeight = 300 } = data;

    if (!url) {
      throw new BadRequest("Missing required field: url");
    }

    try {
      // Download original image from S3 URL
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000
      });

      const imageBuffer = Buffer.from(response.data);

      // Resize image maintaining aspect ratio
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Get thumbnail metadata
      const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

      // Extract filename from URL
      const urlParts = url.split("/");
      const originalFilename = urlParts[urlParts.length - 1];
      const filename = `thumb-${originalFilename.split("?")[0]}`;

      // Upload thumbnail to S3
      const userId = params?.user?._id;
      const timestamp = Date.now();
      const thumbnailPath = `message-attachments/${userId}/thumbnails/${timestamp}-${filename}`;

      const uploadParams = {
        Bucket: aws.s3BucketName,
        Key: thumbnailPath,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      };

      await s3.upload(uploadParams).promise();

      // Construct thumbnail URL (CloudFront if available)
      const thumbnailUrl = aws.cloudFrontUrl
        ? `https://${aws.cloudFrontUrl}/${thumbnailPath}`
        : `https://${aws.s3BucketName}.s3.${aws.s3BucketRegion}.amazonaws.com/${thumbnailPath}`;

      return {
        thumbnailUrl,
        width: thumbnailMetadata.width,
        height: thumbnailMetadata.height
      };
    } catch (error: any) {
      throw new BadRequest(`Failed to generate thumbnail: ${error.message}`);
    }
  }
}
