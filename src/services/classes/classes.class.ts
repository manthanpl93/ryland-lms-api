import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../declarations";
import {
  adminCreate,
  adminDelete,
  adminFind,
  adminGet,
  adminPatch,
} from "./handlers/adminClassHandlers";
import { teacherFind, teacherGet } from "./handlers/teacherClassHandlers";
import { studentGet } from "./handlers/studentClassHandlers";

type HandlerFn = (id: any, data: any, params: any, app: Application, model: any) => Promise<any>;
type HandlerRegistry = Record<string, Record<string, HandlerFn | undefined>>;

const classHandlers: HandlerRegistry = {
  GET: {
    Admin: adminGet,
    Teacher: teacherGet,
    Student: studentGet,
  },
  FIND: {
    Admin: adminFind,
    Teacher: teacherFind,
  },
  CREATE: {
    Admin: adminCreate,
  },
  PATCH: {
    Admin: adminPatch,
  },
  DELETE: {
    Admin: adminDelete,
  },
};

export class Classes extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  private resolveHandler(action: keyof typeof classHandlers, role?: string): HandlerFn {
    const handler =
      classHandlers[action][role as keyof (typeof classHandlers)[typeof action]];

    if (!handler) {
      throw new BadRequest(
        `${role || "User"} role does not have access to ${action.toLowerCase()} classes`
      );
    }

    return handler;
  }

  async get(id: string, params?: any | undefined): Promise<any> {
    const handler = this.resolveHandler("GET", params?.user?.role);
    return handler(id, null, params, this.app, this.Model);
  }

  async find(params?: any): Promise<any> {
    const handler = this.resolveHandler("FIND", params?.user?.role);
    return handler(null, null, params, this.app, this.Model);
  }

  async create(data: any, params?: any): Promise<any> {
    const handler = this.resolveHandler("CREATE", params?.user?.role);
    return handler(null, data, params, this.app, this.Model);
  }

  async patch(id: any, data: any, params?: any): Promise<any> {
    const handler = this.resolveHandler("PATCH", params?.user?.role);
    return handler(id, data, params, this.app, this.Model);
  }

  async remove(id: any, params?: any): Promise<any> {
    const handler = this.resolveHandler("DELETE", params?.user?.role);
    return handler(id, null, params, this.app, this.Model);
  }

  async updateStudentCount(classId: string, increment: number): Promise<void> {
    await this.Model.findByIdAndUpdate(classId, {
      $inc: { totalStudents: increment },
    });
  }

  async updateCourseCount(classId: string, increment: number): Promise<void> {
    await this.Model.findByIdAndUpdate(classId, {
      $inc: { totalCourses: increment },
    });
  }
}

