import type { Application } from "../declarations";
import { Model, Mongoose, Document, Types } from "mongoose";

export interface ConversationDocument extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    timestamp: Date;
  };
  lastMessageAt: Date;
  unreadCount: Map<string, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  getOtherParticipant(userId: string): Types.ObjectId;
}

export default function (app: Application): Model<ConversationDocument> {
  const modelName = "conversations";
  const mongooseClient: Mongoose = app.get("mongooseClient");
  const { Schema } = mongooseClient;

  const conversationsSchema = new Schema(
    {
      participants: [
        {
          type: Schema.Types.ObjectId,
          ref: "users",
          required: true,
          index: true,
        },
      ],
      
      lastMessage: {
        content: { type: String, trim: true },
        senderId: { type: Schema.Types.ObjectId, ref: "users" },
        timestamp: { type: Date },
      },
      
      lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true,
      },
      
      unreadCount: {
        type: Map,
        of: Number,
        default: {},
      },
      
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // Indexes
  conversationsSchema.index({ participants: 1 });
  conversationsSchema.index({ lastMessageAt: -1 });
  conversationsSchema.index({ participants: 1 }, { unique: true });

  // Validation: Exactly 2 participants
  conversationsSchema.pre("save", function (next) {
    if (this.participants.length !== 2) {
      next(new Error("Conversation must have exactly 2 participants"));
    } else {
      next();
    }
  });

  // Method: Get other participant
  conversationsSchema.methods.getOtherParticipant = function (userId: string) {
    return this.participants.find(
      (id: any) => id.toString() !== userId.toString()
    );
  };

  // Virtual: messages
  conversationsSchema.virtual("messages", {
    ref: "messages",
    localField: "_id",
    foreignField: "conversationId",
  });

  if (mongooseClient.modelNames().includes(modelName)) {
    (mongooseClient as any).deleteModel(modelName);
  }

  return mongooseClient.model<ConversationDocument>(modelName, conversationsSchema);
}

