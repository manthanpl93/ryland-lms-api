import { HooksObject } from "@feathersjs/feathers";
import * as authentication from "@feathersjs/authentication";
import { authorizeClassTeachers } from "./class-teachers.authorization";

const { authenticate } = authentication.hooks;

export default (app: any) => ({
  before: {
    all: [authenticate("jwt")],
    find: [authorizeClassTeachers(app)],
    get: [],
    create: [authorizeClassTeachers(app)],
    update: [authorizeClassTeachers(app)],
    patch: [authorizeClassTeachers(app)],
    remove: [authorizeClassTeachers(app)],
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

