import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, NotFound, Forbidden } from "@feathersjs/errors";
import { ConversationAttachmentDocument } from "../../models/conversation-attachments.model";
import createConversationModel from "../../models/conversations.model";

export class ConversationAttachments extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { conversationId, type } = params?.query || {};

    if (!conversationId) {
      throw new BadRequest("conversationId is required");
    }

    // Verify user is participant in the conversation
    const conversationService = this.app.service("conversations");
    const conversation = await conversationService.get(conversationId, params);

    const userId = params?.user?._id;

    if (
      !conversation.participants.some(
        (p: any) => p._id?.toString() === userId?.toString() || p.toString() === userId?.toString()
      )
    ) {
      throw new Forbidden("Not a participant in conversation");
    }

    // Build query
    const query: any = {
      conversationId,
      ...params?.query,
    };

    // Filter by type if provided
    if (type && ["image", "link", "document"].includes(type)) {
      query.type = type;
    }

    // Remove conversationId from query as we've already added it
    delete query.conversationId;

    // Get attachments sorted by newest first
    const attachments = await this.Model.find(query)
      .sort({ createdAt: -1 })
      .limit(params?.query?.$limit || 50)
      .skip(params?.query?.$skip || 0)
      .populate("senderId", "firstName lastName avatar");

    const total = await this.Model.countDocuments(query);

    return {
      total,
      limit: params?.query?.$limit || 50,
      skip: params?.query?.$skip || 0,
      data: attachments
    };
  }

  async get(id: string, params?: Params): Promise<any> {
    const attachment = await this.Model.findById(id)
      .populate("senderId", "firstName lastName avatar")
      .populate("messageId", "content createdAt");

    if (!attachment) {
      throw new NotFound("Attachment not found");
    }

    // Verify user has access to this attachment's conversation
    const conversationModel = createConversationModel(this.app);
    const conversation = await conversationModel.findById((attachment as any).conversationId);

    if (!conversation) {
      throw new NotFound("Conversation not found");
    }

    const userId = params?.user?._id;
    const isParticipant = conversation.participants.some(
      (p: any) => p._id?.toString() === userId?.toString() || p.toString() === userId?.toString()
    );

    if (!isParticipant) {
      throw new Forbidden("Not a participant in conversation");
    }

    return attachment;
  }

  /**
   * Internal method to create attachment records
   * Called from message handlers
   */
  async createAttachmentRecord(data: {
    conversationId: string;
    messageId: string;
    attachmentId: string;
    type: "image" | "link" | "document";
    url: string;
    metadata: any;
    senderId: string;
  }): Promise<ConversationAttachmentDocument> {
    return await this.Model.create(data) as ConversationAttachmentDocument;
  }

  /**
   * Internal method to remove attachment records when message is deleted
   */
  async removeAttachmentsByMessage(messageId: string): Promise<any> {
    return await this.Model.deleteMany({ messageId });
  }
}
