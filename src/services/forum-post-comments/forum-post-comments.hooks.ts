import * as authentication from "@feathersjs/authentication";
import { HookContext } from "@feathersjs/feathers";

const { authenticate } = authentication.hooks;

// Populate author in response
const populateAuthor = async (context: HookContext) => {
  const { app, result } = context;

  const populate = async (comment: any) => {
    if (!comment) return comment;

    if (comment.authorId) {
      const usersModel = app.get("mongooseClient").models.users;
      const author = await usersModel
        .findById(comment.authorId)
        .select("firstName lastName email")
        .lean();
      comment.author = author;
    }

    return comment;
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
    find: [populateAuthor],
    get: [populateAuthor],
    create: [populateAuthor],
    update: [populateAuthor],
    patch: [populateAuthor],
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

