import * as authentication from "@feathersjs/authentication";
import { disallow } from "feathers-hooks-common";
import { authorizeForumClasses } from "./forum-classes.authorization";
import { Application } from "../../declarations";

const { authenticate } = authentication.hooks;

export default function (app: Application): any {
  return {
    before: {
      all: [authenticate("jwt")],
      find: [authorizeForumClasses()],
      get: [disallow()],
      create: [disallow()],
      update: [disallow()],
      patch: [disallow()],
      remove: [disallow()]
    },

    after: {
      all: [],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    },

    error: {
      all: [],
      find: [],
      get: [],
      create: [],
      update: [],
      patch: [],
      remove: []
    }
  };
}

