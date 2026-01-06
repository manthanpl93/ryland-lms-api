/**
 * Course Lessons Service Hooks
 *
 * This file contains the authentication hook.
 * All business logic is handled in the service class.
 */

import { authenticate } from "@feathersjs/authentication";

/**
 * Export hooks configuration
 */
export default {
  before: {
    all: [authenticate("jwt")],
    create: [],
    find: [],
    get: [],
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [],
    create: [],
    find: [],
    get: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    create: [],
    find: [],
    get: [],
    update: [],
    patch: [],
    remove: [],
  },
};

