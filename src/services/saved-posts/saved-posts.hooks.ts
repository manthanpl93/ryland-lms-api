import * as authentication from "@feathersjs/authentication";
import { HookContext } from "@feathersjs/feathers";

const { authenticate } = authentication.hooks;

// Populate post details
const populatePost = async (context: HookContext) => {
  const { app, result } = context;

  const populate = async (savedPost: any) => {
    if (!savedPost) return savedPost;

    if (savedPost.postId) {
      const forumPostsModel = app.get("mongooseClient").models.forumPosts;
      const post = await forumPostsModel
        .findById(savedPost.postId)
        .lean();
      
      if (post) {
        // Populate post author
        const usersModel = app.get("mongooseClient").models.users;
        const author = await usersModel
          .findById(post.authorId)
          .select("firstName lastName email")
          .lean();
        post.author = author;

        // Populate tags
        if (post.tags && post.tags.length > 0) {
          const forumTagsModel = app.get("mongooseClient").models.forumTags;
          const tags = await forumTagsModel
            .find({ _id: { $in: post.tags } })
            .select("name color")
            .lean();
          post.tagDetails = tags;
        }

        savedPost.post = post;
      }
    }

    return savedPost;
  };

  if (result) {
    if (Array.isArray(result)) {
      context.result = await Promise.all(result.map(populate));
    } else if (result.data && Array.isArray(result.data)) {
      // Handle paginated results
      result.data = await Promise.all(result.data.map(populate));
    } else {
      context.result = await populate(result);
    }
  }

  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [],
    find: [populatePost],
    get: [populatePost],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};

