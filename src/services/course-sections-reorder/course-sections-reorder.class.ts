import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import { reorderSections } from "./handlers/reorderSectionHandler";

type Role = "Admin" | "Teacher";

const reorderHandlers = {
  PATCH: {
    Admin: reorderSections,
    Teacher: reorderSections,
  },
};

export class CourseSectionsReorder extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async patch(id: any, data: any, params?: any) {
    const userRole = params?.user?.role as Role | undefined;
    const handler = userRole ? reorderHandlers.PATCH[userRole] : undefined;

    if (!handler) {
      throw new BadRequest("You do not have access to reorder sections");
    }

    return handler(null, data, params, this.app);
  }
}
