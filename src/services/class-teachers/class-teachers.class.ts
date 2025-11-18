import { Params, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { BadRequest, NotFound, Conflict } from "@feathersjs/errors";
import { Application } from "../../declarations";
import mongoose from "mongoose";

export class ClassTeachers extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { query } = params || {};
    const { controller } = query || {};

    // Handle different controllers
    if (controller === "class-teachers") {
      return this.getTeachersByClass(query);
    }

    if (controller === "teacher-classes") {
      return this.getClassesByTeacher(query);
    }

    // Default find behavior
    return super.find(params);
  }

  async create(data: any, params?: Params): Promise<any> {
    console.log("params?.user", params?.user);
    // Validate required fields
    if (!data.classId) {
      throw new BadRequest("Class ID is required");
    }

    if (!data.teacherId) {
      throw new BadRequest("Teacher ID is required");
    }

    // Check if assignment already exists
    const existingAssignment = await this.Model.findOne({
      classId: data.classId,
      teacherId: data.teacherId,
    });

    if (existingAssignment) {
      throw new Conflict("Teacher is already assigned to this class");
    }

    // Verify class exists
    const classData = await (this.app.service("classes") as any).get(data.classId, params);
    if (!classData) {
      throw new NotFound("Class not found");
    }

    // Verify teacher exists and has correct role
    const teacher = await (this.app.service("users") as any).get(data.teacherId, params);
    if (!teacher) {
      throw new NotFound("Teacher not found");
    }

    if (teacher.role !== "Teacher") {
      throw new BadRequest("User must have Teacher role");
    }

    // Set assignedBy from authenticated user
    if (params?.user?._id && !data.assignedBy) {
      data.assignedBy = params.user._id;
    }

    // Create assignment
    return super.create(data, params);
  }

  async patch(id: Id, data: any, params?: Params): Promise<any> {
    const assignment = await this.Model.findById(id);

    if (!assignment) {
      throw new NotFound("Teacher assignment not found");
    }

    return super.patch(id, data, params);
  }

  async remove(id: Id, params?: Params): Promise<any> {
    const assignment = await this.Model.findById(id);

    if (!assignment) {
      throw new NotFound("Teacher assignment not found");
    }

    return super.remove(id, params);
  }

  // Get all teachers for a class with user details
  async getTeachersByClass(query: any): Promise<any> {
    const { classId, isActive } = query;

    if (!classId) {
      throw new BadRequest("Class ID is required");
    }

    // Convert classId to ObjectId if it's a string
    const classObjectId = typeof classId === "string" && mongoose.Types.ObjectId.isValid(classId)
      ? new mongoose.Types.ObjectId(classId)
      : classId;

    console.log("getTeachersByClass - classId:", classId);
    console.log("getTeachersByClass - classObjectId:", classObjectId);

    const matchStage: any = { classId: classObjectId };

    if (isActive !== undefined) {
      matchStage.isActive = isActive === "true" || isActive === true;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: "$teacher" },
      {
        $project: {
          _id: 1,
          classId: 1,
          teacherId: 1,
          assignedDate: 1,
          assignedBy: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          teacher: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            mobileNo: 1,
            status: 1,
          },
        },
      },
    ];

    const data = await this.Model.aggregate(pipeline);

    return {
      total: data.length,
      data,
    };
  }

  // Get all classes for a teacher
  async getClassesByTeacher(query: any): Promise<any> {
    const { teacherId, isActive } = query;

    if (!teacherId) {
      throw new BadRequest("Teacher ID is required");
    }

    // Convert teacherId to ObjectId if it's a string
    const teacherObjectId = typeof teacherId === "string" && mongoose.Types.ObjectId.isValid(teacherId)
      ? new mongoose.Types.ObjectId(teacherId)
      : teacherId;

    const matchStage: any = { teacherId: teacherObjectId };

    if (isActive !== undefined) {
      matchStage.isActive = isActive === "true" || isActive === true;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "class",
        },
      },
      { $unwind: "$class" },
      {
        $project: {
          _id: 1,
          classId: 1,
          assignedDate: 1,
          isActive: 1,
          class: 1,
        },
      },
    ];

    const data = await this.Model.aggregate(pipeline);

    return {
      total: data.length,
      data,
    };
  }
}

