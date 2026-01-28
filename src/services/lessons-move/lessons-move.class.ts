import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import { moveLesson } from "./handlers/moveLessonHandler";

type Role = "Admin" | "Teacher";

const moveHandlers = {
  PATCH: {
    Admin: moveLesson,
    Teacher: moveLesson,
  },
};

export class LessonsMove extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async patch(lessonId: string, data: any, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? moveHandlers.PATCH[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to move lessons");
    }

    return handler(lessonId, data, params, this.app);
  }
}
