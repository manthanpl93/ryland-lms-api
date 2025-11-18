import * as feathersAuthentication from "@feathersjs/authentication";
import { HookContext } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

const { authenticate } = feathersAuthentication.hooks;

// Hook to ensure only teachers can access this service
const requireTeacher = async (context: HookContext) => {
  const { user } = context.params;

  if (!user) {
    throw new BadRequest("Authentication required");
  }

  if (user.role !== "Teacher") {
    throw new BadRequest("This endpoint is only accessible by teachers");
  }

  return context;
};

export default {
  before: {
    all: [authenticate("jwt"), requireTeacher],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
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

