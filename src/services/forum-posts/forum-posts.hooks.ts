import * as authentication from "@feathersjs/authentication";
import { Forbidden, BadRequest } from "@feathersjs/errors";
import { HookContext } from "@feathersjs/feathers";

const { authenticate } = authentication.hooks;

// Validate user has access to the community
const validateCommunityAccess = async (context: HookContext) => {
  const user = context.params?.user;
  const communityId = context.data?.communityId || context.params?.query?.communityId;

  if (!user || !user.role) {
    throw new Forbidden("Authentication required");
  }

  if (!communityId) {
    return context; // Will be validated elsewhere
  }

  const communitiesModel = context.app.get("mongooseClient").models.communities;
  const community = await communitiesModel.findById(communityId).lean();

  if (!community || !community.isActive) {
    throw new BadRequest("Community not found or inactive");
  }

  // Admin can access all
  if (user.role === "Admin") {
    return context;
  }

  // For Teacher: Check if assigned to class
  if (user.role === "Teacher") {
    const classTeachersModel = context.app.get("mongooseClient").models.classTeachers;
    const assignment = await classTeachersModel.findOne({
      teacherId: user._id,
      classId: community.classId,
      isActive: true,
    }).lean();

    if (!assignment) {
      throw new Forbidden("You do not have access to this community");
    }
  }

  // For Student: Check if enrolled in class
  if (user.role === "Student") {
    const classEnrollmentsModel = context.app.get("mongooseClient").models.classEnrollments;
    const enrollment = await classEnrollmentsModel.findOne({
      studentId: user._id,
      classId: community.classId,
      status: "Active",
    }).lean();

    if (!enrollment) {
      throw new Forbidden("You do not have access to this community");
    }
  }

  return context;
};

// Populate author and tags in response
const populateRelations = async (context: HookContext) => {
  const { app, result } = context;

  const populate = async (post: any) => {
    if (!post) return post;

    // Populate author
    if (post.authorId) {
      const usersModel = app.get("mongooseClient").models.users;
      const author = await usersModel
        .findById(post.authorId)
        .select("firstName lastName email")
        .lean();
      post.author = author;
    }

    // Populate tags
    if (post.tags && post.tags.length > 0) {
      const forumTagsModel = app.get("mongooseClient").models.forumTags;
      const tags = await forumTagsModel
        .find({ _id: { $in: post.tags } })
        .select("name color usageCount")
        .lean();
      post.tagDetails = tags;
    }

    return post;
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
    find: [validateCommunityAccess],
    get: [],
    create: [validateCommunityAccess],
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [],
    find: [populateRelations],
    get: [populateRelations],
    create: [populateRelations],
    update: [populateRelations],
    patch: [populateRelations],
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

