import * as authentication from "@feathersjs/authentication";
import { Forbidden, BadRequest } from "@feathersjs/errors";
import { HookContext } from "@feathersjs/feathers";

const { authenticate } = authentication.hooks;

// Only Admin or Teacher can create/modify tags
const authorizeTagManagement = async (context: HookContext) => {
  const user = context.params?.user;

  if (!user || !user.role) {
    throw new Forbidden("Authentication required");
  }

  const allowedRoles = ["Admin", "Teacher"];
  
  if (!allowedRoles.includes(user.role)) {
    throw new Forbidden("Only Admins and Teachers can manage tags");
  }

  // For Teachers, verify they are assigned to the class of the community
  if (user.role === "Teacher" && context.data?.communityId) {
    const communityId = context.data.communityId;
    const communitiesModel = context.app.get("mongooseClient").models.communities;
    const community = await communitiesModel.findById(communityId).lean();

    if (!community) {
      throw new BadRequest("Community not found");
    }

    // Check if teacher is assigned to this class
    const classTeachersModel = context.app.get("mongooseClient").models.classTeachers;
    const assignment = await classTeachersModel.findOne({
      teacherId: user._id,
      classId: community.classId,
      isActive: true,
    }).lean();

    if (!assignment) {
      throw new Forbidden("You are not assigned to this class");
    }
  }

  return context;
};

// Validate community access for find operations
const validateCommunityAccess = async (context: HookContext) => {
  const user = context.params?.user;
  const communityId = context.params?.query?.communityId;

  if (!user || !user.role) {
    throw new Forbidden("Authentication required");
  }

  if (!communityId) {
    throw new BadRequest("communityId is required");
  }

  // Get community and check if user has access to the class
  const communitiesModel = context.app.get("mongooseClient").models.communities;
  const community = await communitiesModel.findById(communityId).lean();

  if (!community) {
    throw new BadRequest("Community not found");
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

export default {
  before: {
    all: [authenticate("jwt")],
    find: [validateCommunityAccess],
    get: [authenticate("jwt")],
    create: [authorizeTagManagement],
    update: [authorizeTagManagement],
    patch: [authorizeTagManagement],
    remove: [authorizeTagManagement],
  },

  after: {
    all: [],
    find: [],
    get: [],
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

