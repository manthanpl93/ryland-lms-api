import type { Application } from "../declarations";
import { Model, Mongoose, Document, Types } from "mongoose";

export interface MessageDocument extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  content: string;
  status: {
    delivered: boolean;
    deliveredAt?: Date;
    read: boolean;
    readAt?: Date;
  };
  isEdited: boolean;
  editedAt?: Date;
  originalContent?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export default function (app: Application): Model<MessageDocument> {
  const modelName = "messages";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const messagesSchema = new Schema(
    {
      conversationId: {
        type: Schema.Types.ObjectId,
        ref: "conversations",
        required: true,
        index: true,
      },
      
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      
      recipientId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
      },
      
      content: {
        type: String,
        required: true,
        trim: true,
      },
      
      status: {
        delivered: {
          type: Boolean,
          default: false,
        },
        deliveredAt: {
          type: Date,
        },
        read: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
        },
      },
      
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: {
        type: Date,
      },
      originalContent: {
        type: String,
      },
      
      isDeleted: {
        type: Boolean,
        default: false,
      },
      deletedAt: {
        type: Date,
      },
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes
  messagesSchema.index({ conversationId: 1, createdAt: -1 });
  messagesSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
  messagesSchema.index({ conversationId: 1, isDeleted: 1 });

  // Virtual: sender
  messagesSchema.virtual("sender", {
    ref: "users",
    localField: "senderId",
    foreignField: "_id",
    justOne: true,
  });

  // Virtual: recipient
  messagesSchema.virtual("recipient", {
    ref: "users",
    localField: "recipientId",
    foreignField: "_id",
    justOne: true,
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<MessageDocument>(modelName, messagesSchema);
}

