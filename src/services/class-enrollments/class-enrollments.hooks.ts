import { HooksObject } from "@feathersjs/feathers";
import * as authentication from "@feathersjs/authentication";
import { authorizeClassEnrollments } from "./class-enrollments.authorization";

const { authenticate } = authentication.hooks;

export default (app: any) => ({
  before: {
    all: [authenticate("jwt")],
    find: [authorizeClassEnrollments(app)],
    get: [],
    create: [authorizeClassEnrollments(app)],
    update: [authorizeClassEnrollments(app)],
    patch: [authorizeClassEnrollments(app)],
    remove: [authorizeClassEnrollments(app)],
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
});

