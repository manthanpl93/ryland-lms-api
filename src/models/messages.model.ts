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
  reactions: {
    userId: Types.ObjectId;
    reactionType: "thumbs_up" | "heart" | "laugh" | "surprised" | "sad";
    createdAt: Date;
  }[];
  reactionCounts: {
    thumbs_up: number;
    heart: number;
    laugh: number;
    surprised: number;
    sad: number;
    total: number;
  };
  reply?: {
    messageId: Types.ObjectId;     // Reference to original message
    content: string;               // Cached content preview (max 200 chars)
    messageType: 'text';           // Type of original message
    senderId: Types.ObjectId;      // Original sender (for queries/display)
  };
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

      // Embedded reactions - each user can have one reaction per message
      reactions: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: "users",
          required: true
        },
        reactionType: {
          type: String,
          enum: ["thumbs_up", "heart", "laugh", "surprised", "sad"],
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],

      // Aggregated counts for quick access
      reactionCounts: {
        thumbs_up: { type: Number, default: 0 },
        heart: { type: Number, default: 0 },
        laugh: { type: Number, default: 0 },
        surprised: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
      },

      // Reply metadata - optional, only present for reply messages
      reply: {
        messageId: {
          type: Schema.Types.ObjectId,
          ref: "messages",
          required: false,  // Not required since whole reply object is optional
        },
        content: {
          type: String,
          required: false,  // Not required since whole reply object is optional
          maxlength: 203,   // 200 chars + "..." for truncation
        },
        messageType: {
          type: String,
          enum: ["text"],
          required: false,  // Not required since whole reply object is optional
        },
        senderId: {
          type: Schema.Types.ObjectId,
          ref: "users",
          required: false,  // Not required since whole reply object is optional
        }
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

