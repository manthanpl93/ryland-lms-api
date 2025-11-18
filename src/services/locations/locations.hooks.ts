import { HooksObject } from "@feathersjs/feathers";
import * as authentication from "@feathersjs/authentication";
import { BadRequest } from "@feathersjs/errors";
import { ObjectId } from "mongodb";
import { CreateLocationDto, Location, ParentLocation, ChildLocation } from "../../types/locations.types";

const { authenticate } = authentication.hooks;

/**
 * Validate MongoDB ObjectId format.
 */
const isValidId = (id: string): boolean => {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

/**
 * Validate parentLocation for ChildLocation.
 */
const validateParentLocation = async (context: any) => {
  const { data, app } = context;
  const isChildLocation = (data as ChildLocation).isParentLocation === false;

  if (isChildLocation && data.parentLocation) {
    if (!isValidId(data.parentLocation)) {
      throw new BadRequest("Invalid parentLocation ID format.");
    }

    const parent = await app.service("categories").get(data.parentLocation);
    if (!parent || parent.type !== "location" || !parent.isParentLocation) {
      throw new BadRequest("parentLocation must reference a valid parent location.");
    }
  }
  return context;
};

/**
 * Validate childLocations for ParentLocation.
 */
const validateChildLocations = async (context: any) => {
  const { data, app } = context;
  const isParentLocation = (data as ParentLocation).isParentLocation === true;

  if (isParentLocation && data.childLocations) {
    if (!Array.isArray(data.childLocations)) {
      throw new BadRequest("childLocations must be an array.");
    }

    for (const childId of data.childLocations) {
      if (!isValidId(childId)) {
        throw new BadRequest(`Invalid childLocation ID format: ${childId}.`);
      }

      const child = await app.service("categories").get(childId);
      if (!child || child.type !== "location" || child.isParentLocation) {
        throw new BadRequest(`childLocation ${childId} must reference a valid child location.`);
      }
    }
  }
  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [validateParentLocation, validateChildLocations],
    update: [],
    patch: [validateParentLocation, validateChildLocations],
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
} as HooksObject; 