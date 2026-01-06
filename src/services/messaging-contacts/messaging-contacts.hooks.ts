import { HooksObject } from "@feathersjs/feathers";
import * as feathersAuthentication from "@feathersjs/authentication";
import { BadRequest, Forbidden } from "@feathersjs/errors";

const { authenticate } = feathersAuthentication.hooks;

// Authorization hook
const authorizeContactAccess = async (context: any) => {
  const { user } = context.params;
  const { query } = context.params;

  // Check role override (admin only)
  if (query?.role && user.role !== "Admin") {
    throw new Forbidden("Only admins can override role parameter");
  }

  return context;
};

// Query validation hook
const validateQuery = async (context: any) => {
  const { query } = context.params;

  // Validate allowed query parameters
  const allowedParams = ["role", "search"];
  const queryKeys = Object.keys(query || {});

  for (const key of queryKeys) {
    if (!allowedParams.includes(key)) {
      throw new BadRequest(`Invalid query parameter: ${key}`);
    }
  }

  // Validate role parameter
  if (query?.role) {
    const validRoles = ["Student", "Teacher", "Admin"];
    if (!validRoles.includes(query.role)) {
      throw new BadRequest("Invalid role parameter");
    }
  }

  return context;
};

// School-aware filtering hook
const schoolAwareFilter = async (context: any) => {
  const { user } = context.params;

  // Non-admins should only see contacts from their school
  if (user.role !== "Admin" && user.schoolId) {
    context.params.schoolFilter = {
      school: user.schoolId,
    };
  }

  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [validateQuery, authorizeContactAccess, schoolAwareFilter],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
} as HooksObject;
