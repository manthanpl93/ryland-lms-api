import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import {
  createSection,
  updateSection,
  deleteSection,
} from "./handlers/commonSectionHandlers";
import {
  ICreateSectionRequest,
  IUpdateSectionRequest,
} from "../authors/courses/courses.types";

type Role = "Admin" | "Teacher";

const sectionHandlers = {
  CREATE: {
    Admin: createSection,
    Teacher: createSection,
  },
  PATCH: {
    Admin: updateSection,
    Teacher: updateSection,
  },
  DELETE: {
    Admin: deleteSection,
    Teacher: deleteSection,
  },
};

export class CourseSections extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: ICreateSectionRequest, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? sectionHandlers.CREATE[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to create sections");
    }

    return handler(null, data, params, this.app);
  }

  async patch(id: any, data: IUpdateSectionRequest, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? sectionHandlers.PATCH[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to update sections");
    }

    return handler(id, data, params, this.app);
  }

  async remove(id: any, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? sectionHandlers.DELETE[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to delete sections");
    }

    return handler(id, null, params, this.app);
  }
}

