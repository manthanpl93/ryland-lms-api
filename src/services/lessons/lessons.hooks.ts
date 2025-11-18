import * as feathersAuthentication from "@feathersjs/authentication";
import { BadRequest, Forbidden } from "@feathersjs/errors";
import { canModifyCourse } from "../courses/courseAuthGuard";

const { authenticate } = feathersAuthentication.hooks;

export const ensureCourseModification = async (context: any) => {
  const courseId = context?.params?.query?.courseId;
  if (!courseId) {
    throw new BadRequest("courseId must be provided in query parameters");
  }

  const userId = context?.params?.user?._id;
  if (!userId) {
    throw new Forbidden("Authentication required");
  }

  const canModify = await canModifyCourse(courseId, userId, context.params, context.app);
  if (!canModify) {
    throw new Forbidden("You do not have permission to modify this course.");
  }

  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [ensureCourseModification],
    update: [ensureCourseModification],
    patch: [ensureCourseModification],
    remove: [ensureCourseModification],
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

