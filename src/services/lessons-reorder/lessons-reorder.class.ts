import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import { reorderLessons } from "./handlers/reorderLessonHandler";

type Role = "Admin" | "Teacher";

const reorderHandlers = {
  PATCH: {
    Admin: reorderLessons,
    Teacher: reorderLessons,
  },
};

export class LessonsReorder extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async patch(id: any, data: any, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? reorderHandlers.PATCH[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to reorder lessons");
    }

    return handler(null, data, params, this.app);
  }
}
