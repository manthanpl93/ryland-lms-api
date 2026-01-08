import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

export class ForumFeed {
  app: Application;

  constructor(options: any, app: Application) {
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { category, communityId, classId, tagIds } = params?.query || {};
    const userId = params?.user?._id;

    if (!category) {
      throw new BadRequest("category parameter is required (hot/new/top/saved)");
    }

    if (!["hot", "new", "top", "saved"].includes(category)) {
      throw new BadRequest("category must be one of: hot, new, top, saved");
    }

    const forumPostsModel = this.app.get("mongooseClient").models.forumPosts;
    const savedPostsModel = this.app.get("mongooseClient").models.savedPosts;
    const forumPostVotesModel = this.app.get("mongooseClient").models.forumPostVotes;

    // Build base query
    const query: any = { isDeleted: false };

    // Filter by community or class (at least one required)
    if (communityId) {
      query.communityId = communityId;
    } else if (classId) {
      query.classId = classId;
    } else {
      throw new BadRequest("Either communityId or classId is required");
    }

    // Filter by tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      query.tags = { $in: tagIds };
    }

    let posts: any[] = [];

    switch (category) {
    case "new":
      posts = await forumPostsModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(params?.query?.$limit || 20)
        .lean();
      break;

    case "top":
      posts = await forumPostsModel
        .find(query)
        .sort({ voteScore: -1 })
        .limit(params?.query?.$limit || 20)
        .lean();
      break;

    case "hot":
      // Get all posts and calculate hot score
      const allPosts = await forumPostsModel
        .find(query)
        .lean();

      posts = allPosts
        .map((post: any) => ({
          ...post,
          hotScore: this.calculateHotScore(post.voteScore, post.createdAt),
        }))
        .sort((a: any, b: any) => b.hotScore - a.hotScore)
        .slice(0, params?.query?.$limit || 20);
      break;

    case "saved":
      // Get user's saved posts
      const savedPosts = await savedPostsModel
        .find({ userId })
        .sort({ savedAt: -1 })
        .limit(params?.query?.$limit || 20)
        .lean();

      if (savedPosts.length === 0) {
        posts = [];
      } else {
        const savedPostIds = savedPosts.map((sp: any) => sp.postId);
        query._id = { $in: savedPostIds };
          
        const postsList = await forumPostsModel.find(query).lean();
          
        // Sort by savedAt order
        posts = savedPostIds
          .map((postId: any) => 
            postsList.find((p: any) => p._id.toString() === postId.toString())
          )
          .filter(Boolean);
      }
      break;
    }

    // Enrich posts with user-specific data
    posts = await this.enrichPostsWithUserData(posts, userId);

    return {
      total: posts.length,
      limit: params?.query?.$limit || 20,
      skip: 0,
      data: posts,
    };
  }

  // Calculate hot score using time-decay algorithm
  private calculateHotScore(voteScore: number, createdAt: Date): number {
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return voteScore / Math.pow(hoursSinceCreation + 2, 1.5);
  }

  // Enrich posts with author, tags, user vote status, and saved status
  private async enrichPostsWithUserData(posts: any[], userId: any): Promise<any[]> {
    const usersModel = this.app.get("mongooseClient").models.users;
    const forumTagsModel = this.app.get("mongooseClient").models.forumTags;
    const forumPostVotesModel = this.app.get("mongooseClient").models.forumPostVotes;
    const savedPostsModel = this.app.get("mongooseClient").models.savedPosts;

    const postIds = posts.map((p: any) => p._id);

    // Get user's votes for these posts
    const userVotes = await forumPostVotesModel
      .find({ userId, postId: { $in: postIds } })
      .lean();

    const voteMap: any = {};
    userVotes.forEach((vote: any) => {
      voteMap[vote.postId.toString()] = vote.voteType;
    });

    // Get user's saved posts
    const savedPosts = await savedPostsModel
      .find({ userId, postId: { $in: postIds } })
      .lean();

    const savedMap: any = {};
    savedPosts.forEach((saved: any) => {
      savedMap[saved.postId.toString()] = true;
    });

    // Enrich each post
    for (const post of posts) {
      // Populate author
      if (post.authorId) {
        const author = await usersModel
          .findById(post.authorId)
          .select("firstName lastName email")
          .lean();
        post.author = author;
      }

      // Populate tags
      if (post.tags && post.tags.length > 0) {
        const tags = await forumTagsModel
          .find({ _id: { $in: post.tags } })
          .select("name color")
          .lean();
        post.tagDetails = tags;
      }

      // Add user vote status
      post.userVote = voteMap[post._id.toString()] || null;

      // Add saved status
      post.isSaved = savedMap[post._id.toString()] || false;
    }

    return posts;
  }
}

