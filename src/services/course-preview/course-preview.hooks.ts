import * as feathersAuthentication from "@feathersjs/authentication";
import * as local from "@feathersjs/authentication-local";
import { HookContext } from "@feathersjs/feathers";
// Don't remove this comment. It's needed to format import lines nicely.

const { authenticate } = feathersAuthentication.hooks;

const checkUserEnrolledCourse = (context: HookContext) => {
  const params = context?.params;
  const user = params?.user;
  const query: any = params?.query;
  query["userId"] = user?._id;
  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [checkUserEnrolledCourse],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [
      // Make sure the password field is never sent to the client
      // Always must be the last hook
    ],
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
