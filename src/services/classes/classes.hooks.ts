import * as authentication from "@feathersjs/authentication";
import { Forbidden } from "@feathersjs/errors";
import { checkClassAccess, checkClassModifyPermission } from "./classAuthGuard";

const { authenticate } = authentication.hooks;

const restrictRoles =
(allowedRoles: string[]) =>
  async (context: any) => {
    const role = context.params?.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new Forbidden("You are not allowed to perform this action.");
    }

    return context;
  };

export default {
  before: {
    all: [authenticate("jwt")],
    find: [restrictRoles(["Admin", "Teacher"])],
    get: [
      restrictRoles(["Admin", "Teacher", "Student"]),
      async (context: any) => {
        return checkClassAccess(context.app)(context);
      }
    ],
    create: [restrictRoles(["Admin"])],
    update: [
      restrictRoles(["Admin"]),
      async (context: any) => {
        return checkClassModifyPermission(context.app)(context);
      }
    ],
    patch: [
      restrictRoles(["Admin"]),
      async (context: any) => {
        return checkClassModifyPermission(context.app)(context);
      }
    ],
    remove: [
      restrictRoles(["Admin"]),
      async (context: any) => {
        return checkClassModifyPermission(context.app)(context);
      }
    ],
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

