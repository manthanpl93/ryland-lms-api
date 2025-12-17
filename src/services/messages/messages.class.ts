import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, NotFound, Forbidden } from "@feathersjs/errors";
import { MessageDocument } from "../../models/messages.model";
import { ConversationDocument } from "../../models/conversations.model";

export class Messages extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { conversationId } = params?.query || {};

    if (!conversationId) {
      throw new BadRequest("conversationId is required");
    }

    // Verify user is participant
    const conversation = await this.app
      .service("conversations")
      .get(conversationId, params) as ConversationDocument;
    const userId = params?.user?._id;

    if (
      !conversation.participants.some(
        (p: any) => p._id.toString() === userId.toString()
      )
    ) {
      throw new NotFound("Conversation not found");
    }

    // Get messages
    const query = {
      conversationId,
      isDeleted: false,
      ...params?.query,
    };

    const messages = await this.Model.find(query)
      .sort({ createdAt: -1 })
      .populate("senderId", "firstName lastName avatar email")
      .populate("recipientId", "firstName lastName avatar email")
      .limit(params?.query?.$limit || 50)
      .skip(params?.query?.$skip || 0);

    return messages;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { conversationId, content, recipientId } = data;
    const senderId = params?.user?._id;

    if (!conversationId || !content || !recipientId) {
      throw new BadRequest(
        "Missing required fields: conversationId, content, recipientId"
      );
    }

    // Verify conversation exists
    const conversation = await this.app
      .service("conversations")
      .get(conversationId, params) as ConversationDocument;

    if (
      !conversation.participants.some(
        (p: any) => p._id.toString() === senderId.toString()
      )
    ) {
      throw new Forbidden("Not a participant in conversation");
    }

    // Create message
    const message = await this.Model.create({
      conversationId,
      senderId,
      recipientId,
      content: content.trim(),
      status: {
        delivered: false,
        read: false,
      },
    }) as MessageDocument;

    // Update conversation
    await this.app.service("conversations").patch(
      conversationId,
      {
        lastMessage: {
          content: content.trim(),
          senderId,
          timestamp: message.createdAt,
        },
        lastMessageAt: message.createdAt,
        $inc: {
          [`unreadCount.${recipientId}`]: 1,
        },
      },
      { skipHooks: true } as any
    );

    return message;
  }

  async patch(id: string, data: any, params?: Params): Promise<any> {
    const message = await this.Model.findById(id) as MessageDocument | null;

    if (!message) {
      throw new NotFound("Message not found");
    }

    const update: any = {};

    // Mark as read
    if (data.markAsRead) {
      update["status.read"] = true;
      update["status.readAt"] = new Date();

      // Reset unread count for the conversation
      await this.app.service("conversations").patch(
        message.conversationId.toString(),
        {
          [`unreadCount.${params?.user?._id}`]: 0,
        },
        { skipHooks: true } as any
      );
    }

    // Mark as delivered
    if (data.markAsDelivered) {
      update["status.delivered"] = true;
      update["status.deliveredAt"] = new Date();
    }

    // Edit content
    if (data.content) {
      // Only sender can edit
      if (message.senderId.toString() !== params?.user?._id.toString()) {
        throw new Forbidden("Only sender can edit message");
      }

      update.originalContent = message.content;
      update.content = data.content.trim();
      update.isEdited = true;
      update.editedAt = new Date();
    }

    return await this.Model.findByIdAndUpdate(id, update, {
      new: true,
    }).populate("senderId recipientId", "firstName lastName avatar email");
  }

  async remove(id: string, params?: Params): Promise<any> {
    const userId = params?.user?._id;
    const message = await this.Model.findById(id) as MessageDocument | null;

    if (!message) {
      throw new NotFound("Message not found");
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      throw new Forbidden("Only sender can delete message");
    }

    // Soft delete
    return await this.Model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true }
    );
  }
}
