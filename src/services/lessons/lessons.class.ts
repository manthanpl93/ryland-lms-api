import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import {
  createLesson,
  updateLesson,
  deleteLesson,
} from "./handlers/commonLessonHandlers";
import {
  ICreateLessonRequest,
  IUpdateLessonRequest,
} from "../authors/courses/courses.types";

type Role = "Admin" | "Teacher";

const lessonHandlers = {
  CREATE: {
    Admin: createLesson,
    Teacher: createLesson,
  },
  PATCH: {
    Admin: updateLesson,
    Teacher: updateLesson,
  },
  DELETE: {
    Admin: deleteLesson,
    Teacher: deleteLesson,
  },
};

export class Lessons extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: ICreateLessonRequest, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? lessonHandlers.CREATE[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to create lessons");
    }

    return handler(null, data, params, this.app);
  }

  async patch(id: any, data: IUpdateLessonRequest, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? lessonHandlers.PATCH[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to update lessons");
    }

    return handler(id, data, params, this.app);
  }

  async remove(id: any, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? lessonHandlers.DELETE[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to delete lessons");
    }

    return handler(id, null, params, this.app);
  }
}

