import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, Forbidden } from "@feathersjs/errors";

export class ForumPosts extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: any, params?: Params): Promise<any> {
    // Add authorId from authenticated user
    if (params?.user?._id) {
      data.authorId = params.user._id;
    }

    // Validate and process tags
    if (data.tags && data.tags.length > 0) {
      await this.validateTags(data.tags, data.communityId);
    }

    // Create the post
    const post = await super.create(data, params);

    // Increment tag usage counts
    if (data.tags && data.tags.length > 0) {
      await this.updateTagUsageCounts(data.tags, 1);
    }

    return post;
  }

  async find(params?: Params): Promise<any> {
    // Default to excluding deleted posts
    if (!params) params = {};
    if (!params.query) params.query = {};
    
    if (params.query.isDeleted === undefined) {
      params.query.isDeleted = false;
    }

    // Support filtering by tags
    if (params.query.tags && Array.isArray(params.query.tags)) {
      params.query.tags = { $in: params.query.tags };
    }

    return super.find(params);
  }

  async patch(id: any, data: any, params?: Params): Promise<any> {
    // Get existing post
    const existingPost = await super.get(id);

    if (!existingPost) {
      throw new BadRequest("Post not found");
    }

    // Check authorization
    const user = params?.user;
    if (!user || existingPost.authorId.toString() !== user._id.toString()) {
      throw new Forbidden("You can only edit your own posts");
    }

    // Don't allow updating certain fields directly
    delete data.authorId;
    delete data.upvotes;
    delete data.downvotes;
    delete data.voteScore;
    delete data.commentCount;
    delete data.isDeleted;

    // Handle tag updates
    if (data.tags !== undefined) {
      // Validate new tags
      if (data.tags.length > 0) {
        await this.validateTags(data.tags, existingPost.communityId);
      }

      // Calculate tag changes
      const oldTags = existingPost.tags || [];
      const newTags = data.tags || [];

      const oldTagIds = oldTags.map((t: any) => t.toString());
      const newTagIds = newTags.map((t: any) => t.toString());

      const addedTags = newTagIds.filter((t: string) => !oldTagIds.includes(t));
      const removedTags = oldTagIds.filter((t: string) => !newTagIds.includes(t));

      // Update tag usage counts
      if (addedTags.length > 0) {
        await this.updateTagUsageCounts(addedTags, 1);
      }
      if (removedTags.length > 0) {
        await this.updateTagUsageCounts(removedTags, -1);
      }
    }

    return super.patch(id, data, params);
  }

  async remove(id: any, params?: Params): Promise<any> {
    // Get existing post
    const existingPost = await super.get(id);

    if (!existingPost) {
      throw new BadRequest("Post not found");
    }

    // Check authorization - author or moderator (Teacher/Admin)
    const user = params?.user;
    const isAuthor = user && existingPost.authorId.toString() === user._id.toString();
    const isModerator = user && ["Admin", "Teacher"].includes(user.role);

    if (!isAuthor && !isModerator) {
      throw new Forbidden("You do not have permission to delete this post");
    }

    // Soft delete
    const deletedPost = await super.patch(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: user._id,
    });

    // Decrement tag usage counts
    if (existingPost.tags && existingPost.tags.length > 0) {
      const tagIds = existingPost.tags.map((t: any) => t.toString ? t.toString() : t);
      await this.updateTagUsageCounts(tagIds, -1);
    }

    return deletedPost;
  }

  // Helper method to validate tags
  private async validateTags(tagIds: any[], communityId: any): Promise<void> {
    const forumTagsModel = this.app.get("mongooseClient").models.forumTags;

    // Fetch all tags
    const tags = await forumTagsModel.find({
      _id: { $in: tagIds },
    }).lean();

    if (tags.length !== tagIds.length) {
      throw new BadRequest("One or more tag IDs are invalid");
    }

    // Check all tags belong to the same community
    const invalidTags = tags.filter(
      (tag: any) => tag.communityId.toString() !== communityId.toString()
    );

    if (invalidTags.length > 0) {
      throw new BadRequest("All tags must belong to the same community as the post");
    }

    // Check all tags are active
    const inactiveTags = tags.filter((tag: any) => !tag.isActive);
    if (inactiveTags.length > 0) {
      throw new BadRequest("Cannot use inactive tags");
    }
  }

  // Helper method to update tag usage counts
  private async updateTagUsageCounts(tagIds: any[], increment: number): Promise<void> {
    const forumTagsModel = this.app.get("mongooseClient").models.forumTags;

    await forumTagsModel.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { usageCount: increment } }
    );
  }
}

