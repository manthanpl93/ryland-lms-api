import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, NotFound, Forbidden } from "@feathersjs/errors";
import { ConversationDocument } from "../../models/conversations.model";

export class Conversations extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const userId = params?.user?._id;

    if (!userId) {
      throw new BadRequest("User not authenticated");
    }

    // Build query
    const query = {
      participants: userId,
      isActive: true,
      ...params?.query,
    };

    // Get conversations sorted by recent activity
    const conversations = await this.Model.find(query)
      .sort({ lastMessageAt: -1 })
      .populate("participants", "firstName lastName avatar email")
      .limit(params?.query?.$limit || 50)
      .skip(params?.query?.$skip || 0);

    return conversations;
  }

  async create(data: any, params?: Params): Promise<any> {
    const { recipientId } = data;
    const senderId = params?.user?._id;

    if (!senderId || !recipientId) {
      throw new BadRequest("Missing required fields");
    }

    // Sort participants to ensure consistent ordering
    const participants = [senderId, recipientId].sort();

    // Check for existing conversation
    const existing = await this.Model.findOne({
      participants: { $all: participants },
    });

    if (existing) {
      return existing;
    }

    // Validate recipient exists
    const recipient = await this.app.service("users").get(recipientId);
    if (!recipient) {
      throw new NotFound("Recipient not found");
    }

    // Create new conversation
    const conversation = await this.Model.create({
      participants,
      unreadCount: {
        [senderId]: 0,
        [recipientId]: 0,
      },
    });

    return conversation;
  }

  async get(id: string, params?: Params): Promise<any> {
    const userId = params?.user?._id;

    const conversation = await this.Model.findById(id).populate(
      "participants",
      "firstName lastName avatar email"
    ) as ConversationDocument | null;

    if (!conversation) {
      throw new NotFound("Conversation not found");
    }

    // Verify user is a participant
    if (
      !conversation.participants.some(
        (p: any) => p._id.toString() === userId.toString()
      )
    ) {
      throw new Forbidden("Not authorized to view this conversation");
    }

    return conversation;
  }

  async patch(id: string, data: any, params?: Params): Promise<any> {
    const userId = params?.user?._id;

    // Verify conversation exists and user is participant
    const conversation = await this.Model.findById(id) as ConversationDocument | null;
    if (!conversation) {
      throw new NotFound("Conversation not found");
    }

    if (
      !conversation.participants.some(
        (p: any) => p.toString() === userId.toString()
      )
    ) {
      throw new Forbidden("Not authorized to update this conversation");
    }

    // Handle marking as read
    if (data.markAsRead) {
      const update = {
        [`unreadCount.${userId}`]: 0,
      };

      return await this.Model.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      ).populate("participants", "firstName lastName avatar email");
    }

    return await this.Model.findByIdAndUpdate(id, data, { new: true }).populate(
      "participants",
      "firstName lastName avatar email"
    );
  }

  async remove(id: string): Promise<any> {
    // Soft delete
    return await this.Model.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
}
