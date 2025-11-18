import * as feathersAuthentication from "@feathersjs/authentication";
import { HookContext } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";

const { authenticate } = feathersAuthentication.hooks;

// Hook to ensure only admins can access this service
const requireAdmin = async (context: HookContext) => {
  const { user } = context.params;

  if (!user) {
    throw new BadRequest("Authentication required");
  }

  if (user.role !== "Admin") {
    throw new BadRequest("This endpoint is only accessible by administrators");
  }

  return context;
};

export default {
  before: {
    all: [authenticate("jwt"), requireAdmin],
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

