import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

export class SavedPosts extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: any, params?: Params): Promise<any> {
    // Add userId from authenticated user
    if (params?.user?._id) {
      data.userId = params.user._id;
    }

    // Validate post exists
    const forumPostsModel = this.app.get("mongooseClient").models.forumPosts;
    const post = await forumPostsModel.findById(data.postId);
    
    if (!post || post.isDeleted) {
      throw new BadRequest("Post not found or deleted");
    }

    // Check if already saved (return existing instead of error)
    const existing = await this.Model.findOne({
      userId: data.userId,
      postId: data.postId
    }).lean();

    if (existing) {
      return existing; // Already saved, return existing record
    }

    // Set savedAt timestamp
    data.savedAt = new Date();

    return super.create(data, params);
  }

  async find(params?: Params): Promise<any> {
    // Filter by current user
    if (!params) params = {};
    if (!params.query) params.query = {};
    
    if (params?.user?._id) {
      params.query.userId = params.user._id;
    }

    // Sort by savedAt desc (most recent first)
    if (!params.query.$sort) {
      params.query.$sort = {
        savedAt: -1,
      };
    }

    return super.find(params);
  }

  async remove(id: any, params?: Params): Promise<any> {
    // Verify ownership
    const savedPost = await super.get(id);
    const user = params?.user;
    
    if (!savedPost || !user || savedPost.userId.toString() !== user._id.toString()) {
      throw new BadRequest("Saved post not found or you don't have permission to delete it");
    }

    return super.remove(id, params);
  }
}

