import type { Application } from "../declarations";
import { Model, Mongoose, Document, Types } from "mongoose";

export interface ConversationAttachmentDocument extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  messageId: Types.ObjectId;
  attachmentId: Types.ObjectId;
  type: "image" | "link" | "document";
  url: string;
  metadata: any;  // Denormalized metadata from message attachment
  senderId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export default function (app: Application): Model<ConversationAttachmentDocument> {
  const modelName = "conversation-attachments";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const conversationAttachmentsSchema = new Schema(
    {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: "conversations",
        required: true,
        index: true,
      },
      
      messageId: {
        type: Schema.Types.ObjectId,
        ref: "messages",
        required: true,
        index: true,
      },
      
      attachmentId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      
      type: {
        type: String,
        enum: ["image", "link", "document"],
        required: true,
        index: true,
      },
      
      url: {
        type: String,
        required: true,
      },
      
      metadata: {
        type: Schema.Types.Mixed,
        required: true,
      },
      
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Composite indexes for efficient querying
  conversationAttachmentsSchema.index({ conversationId: 1, type: 1 });
  conversationAttachmentsSchema.index({ conversationId: 1, createdAt: -1 });

  // Virtual: message
  conversationAttachmentsSchema.virtual("message", {
    ref: "messages",
    localField: "messageId",
    foreignField: "_id",
    justOne: true,
  });

  // Virtual: sender
  conversationAttachmentsSchema.virtual("sender", {
    ref: "users",
    localField: "senderId",
    foreignField: "_id",
    justOne: true,
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<ConversationAttachmentDocument>(
    modelName,
    conversationAttachmentsSchema
  );
}
