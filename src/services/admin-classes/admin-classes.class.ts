import { Params, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { BadRequest, NotFound } from "@feathersjs/errors";
import { Application } from "../../declarations";
import {
  IAdminClassesListResponse,
  ICreateAdminClassRequest,
  IUpdateAdminClassRequest,
} from "./admin-classes.types";

export class AdminClasses extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<IAdminClassesListResponse> {
    const { query } = params || {};

    // Get schoolId from authenticated user (security)
    if (!params?.user) {
      throw new BadRequest("Authentication required");
    }

    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    // Build the base query - Admin sees all classes in their school
    const baseQuery: any = {
      isDeleted: false,
      schoolId: params.user.schoolId, // Always use authenticated user's schoolId
    };

    // Filter by status if provided
    if (query?.status) {
      baseQuery.status = query.status;
    }

    // Search by name if provided
    if (query?.search) {
      baseQuery.name = { $regex: query.search, $options: "i" };
    }

    // Pagination defaults
    const limit = query?.$limit || 10;
    const skip = query?.$skip || 0;
    const sort = query?.$sort || { createdAt: -1 };

    // Use Model directly to prevent auto-population
    // Using .lean() ensures no mongoose virtuals or population happens
    const data: any[] = await this.Model.find(baseQuery)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean()
      .exec();

    const total = await this.Model.countDocuments(baseQuery);

    return {
      total,
      limit,
      skip,
      data,
    };
  }

  async get(id: Id, params?: Params): Promise<any> {
    // Get schoolId from authenticated user (security)
    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    // Using .lean() to prevent auto-population
    // Also filter by schoolId for security
    const classData = await this.Model.findOne({
      _id: id,
      isDeleted: false,
      schoolId: params.user.schoolId, // Only allow access to classes in user's school
    }).lean();

    if (!classData) {
      throw new NotFound("Class not found");
    }

    return classData;
  }

  async create(
    data: ICreateAdminClassRequest,
    params?: Params
  ): Promise<any> {
    // Validate required fields
    if (!data.name) {
      throw new BadRequest("Class name is required");
    }

    // Get schoolId from authenticated user
    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    // Build the class data with defaults
    const classData = {
      name: data.name,
      schoolId: params.user.schoolId,
      status: "Active" as const, // Default status
      totalStudents: 0,
      totalCourses: 0,
      forumSettings: {
        enableClassForum: false,
        enableCourseForum: false,
        enableAllCourses: false,
        selectedCourses: [],
      },
      messagingSettings: {
        enableMessaging: false,
        enableAllTeachers: false,
        selectedTeachers: [],
      },
      isDeleted: false,
    };

    return super.create(classData, params);
  }

  async patch(
    id: Id,
    data: IUpdateAdminClassRequest,
    params?: Params
  ): Promise<any> {
    // Get schoolId from authenticated user (security)
    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    // Prevent modification of counters directly
    const updateData: any = { ...data };
    delete updateData.totalStudents;
    delete updateData.totalCourses;

    // Verify class exists and belongs to user's school
    const classData = await this.Model.findOne({
      _id: id,
      isDeleted: false,
      schoolId: params.user.schoolId, // Only allow updates to classes in user's school
    });

    if (!classData) {
      throw new NotFound("Class not found");
    }

    return super.patch(id, updateData, params);
  }

  async remove(id: Id, params?: Params): Promise<any> {
    // Get schoolId from authenticated user (security)
    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    // Soft delete - verify class belongs to user's school
    const classData = await this.Model.findOne({
      _id: id,
      isDeleted: false,
      schoolId: params.user.schoolId, // Only allow deletion of classes in user's school
    });

    if (!classData) {
      throw new NotFound("Class not found");
    }

    return this.Model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: "Inactive",
      },
      { new: true }
    );
  }

  // Custom method to update student count
  async updateStudentCount(classId: string, increment: number): Promise<void> {
    await this.Model.findByIdAndUpdate(classId, {
      $inc: { totalStudents: increment },
    });
  }

  // Custom method to update course count
  async updateCourseCount(classId: string, increment: number): Promise<void> {
    await this.Model.findByIdAndUpdate(classId, {
      $inc: { totalCourses: increment },
    });
  }
}

