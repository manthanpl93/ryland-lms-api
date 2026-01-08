import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest, Forbidden } from "@feathersjs/errors";

export class ForumPostComments extends Service {
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

    // Validate post exists
    const forumPostsModel = this.app.get("mongooseClient").models.forumPosts;
    const post = await forumPostsModel.findById(data.postId);
    
    if (!post || post.isDeleted) {
      throw new BadRequest("Post not found or deleted");
    }

    // If parentCommentId is provided, validate it exists
    if (data.parentCommentId) {
      const parentComment = await super.get(data.parentCommentId);
      if (!parentComment || parentComment.isDeleted) {
        throw new BadRequest("Parent comment not found or deleted");
      }
      
      // Increment parent comment's replyCount
      await super.patch(data.parentCommentId, {
        $inc: { replyCount: 1 },
      });
    }

    // Create the comment
    const comment = await super.create(data, params);

    // Increment post's commentCount
    await forumPostsModel.findByIdAndUpdate(data.postId, {
      $inc: { commentCount: 1 },
    });

    return comment;
  }

  async find(params?: Params): Promise<any> {
    // Default to excluding deleted comments
    if (!params) params = {};
    if (!params.query) params.query = {};
    
    if (params.query.isDeleted === undefined) {
      params.query.isDeleted = false;
    }

    return super.find(params);
  }

  async patch(id: any, data: any, params?: Params): Promise<any> {
    // Get existing comment
    const existingComment = await super.get(id);

    if (!existingComment) {
      throw new BadRequest("Comment not found");
    }

    // Check authorization - only author can edit
    const user = params?.user;
    if (!user || existingComment.authorId.toString() !== user._id.toString()) {
      throw new Forbidden("You can only edit your own comments");
    }

    // Don't allow updating certain fields directly
    delete data.authorId;
    delete data.postId;
    delete data.parentCommentId;
    delete data.upvotes;
    delete data.downvotes;
    delete data.voteScore;
    delete data.replyCount;
    delete data.isDeleted;

    return super.patch(id, data, params);
  }

  async remove(id: any, params?: Params): Promise<any> {
    // Get existing comment
    const existingComment = await super.get(id);

    if (!existingComment) {
      throw new BadRequest("Comment not found");
    }

    // Check authorization - author or moderator (Teacher/Admin)
    const user = params?.user;
    const isAuthor = user && existingComment.authorId.toString() === user._id.toString();
    const isModerator = user && ["Admin", "Teacher"].includes(user.role);

    if (!isAuthor && !isModerator) {
      throw new Forbidden("You do not have permission to delete this comment");
    }

    // Soft delete
    return super.patch(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: user._id,
    });

    // Note: We don't decrement commentCount on soft delete to maintain history
  }
}

