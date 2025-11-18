import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";

// Import role-based handlers
import {
  adminGet,
  adminFind,
  adminCreate,
  adminPatch,
  adminDelete,
} from "./handlers/adminCourseHandlers";
import {
  teacherGet,
  teacherFind,
  teacherPatch,
} from "./handlers/teacherCourseHandlers";
import {
  studentGet,
  studentFind,
  studentCreate,
} from "./handlers/studentCourseHandlers";

// Define handler registry
const courseHandlers = {
  GET: {
    Admin: adminGet,
    Teacher: teacherGet,
    Student: studentGet,
  },
  FIND: {
    Admin: adminFind,
    Teacher: teacherFind,
    Student: studentFind,
  },
  CREATE: {
    Admin: adminCreate,
    Student: studentCreate,
  },
  PATCH: {
    Admin: adminPatch,
    Teacher: teacherPatch,
  },
  DELETE: {
    Admin: adminDelete,
  },
};

export class Courses extends Service {
  app: Application;

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async get(id: string, params?: any | undefined): Promise<any> {
    try {
      const userRole = params?.user?.role;
      const handler = courseHandlers.GET[userRole as keyof typeof courseHandlers.GET];

      if (!handler) {
        throw new BadRequest(
          `${userRole} role does not have access to GET courses`
        );
      }

      return handler(id, null, params, this.app);
    } catch (error) {
      throw error;
    }
  }

  async find(params?: any): Promise<any> {
    try {
      const userRole = params?.user?.role;
      const handler = courseHandlers.FIND[userRole as keyof typeof courseHandlers.FIND];

      if (!handler) {
        throw new BadRequest(
          `${userRole} role does not have access to FIND courses`
        );
      }

      return handler(null, null, params, this.app);
    } catch (error) {
      throw error;
    }
  }

  async create(data: any, params?: any): Promise<any> {
    try {
      const userRole = params?.user?.role;
      const handler = courseHandlers.CREATE[userRole as keyof typeof courseHandlers.CREATE];

      if (!handler) {
        throw new BadRequest(
          `${userRole} role does not have access to CREATE courses`
        );
      }

      return handler(null, data, params, this.app);
    } catch (e) {
      console.log("Course create error", e);
      throw e;
    }
  }

  async patch(id: any, data: any, params?: any): Promise<any> {
    try {
      const userRole = params?.user?.role;
      const handler = courseHandlers.PATCH[userRole as keyof typeof courseHandlers.PATCH];

      if (!handler) {
        throw new BadRequest(
          `${userRole} role does not have access to PATCH courses`
        );
      }

      return handler(id, data, params, this.app);
    } catch (error) {
      throw error;
    }
  }

  async remove(id: any, params?: any): Promise<any> {
    try {
      const userRole = params?.user?.role;
      const handler = courseHandlers.DELETE[userRole as keyof typeof courseHandlers.DELETE];

      if (!handler) {
        throw new BadRequest(
          `${userRole} role does not have access to DELETE courses`
        );
      }

      return handler(id, null, params, this.app);
    } catch (error) {
      throw error;
    }
  }
}
