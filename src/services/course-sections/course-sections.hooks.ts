import * as feathersAuthentication from "@feathersjs/authentication";
import { ensureCourseModification } from "../lessons/lessons.hooks";

const { authenticate } = feathersAuthentication.hooks;

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

