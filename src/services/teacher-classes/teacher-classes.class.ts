import { Params, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { BadRequest, NotFound } from "@feathersjs/errors";
import { Application } from "../../declarations";
import {
  ITeacherClassesListResponse,
  ITeacherClassesQueryParams,
} from "./teacher-classes.types";

export class TeacherClasses extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  /**
   * Find classes using aggregation - shows only classes the teacher is assigned to
   */
  async find(params?: Params): Promise<ITeacherClassesListResponse> {
    const query: ITeacherClassesQueryParams = params?.query || {};

    // Get userId and schoolId from authenticated user
    if (!params?.user) {
      throw new BadRequest("Authentication required");
    }

    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    const userId = params.user._id;
    const userSchoolId = params.user.schoolId;

    const mongoose = this.app.get("mongooseClient");
    const ObjectId = mongoose.Types.ObjectId;

    // Build match conditions for classes
    const classMatchConditions: any = {
      isDeleted: false,
    };

    if (query.status) {
      classMatchConditions.status = query.status;
    }

    if (query.search) {
      classMatchConditions.name = { $regex: query.search, $options: "i" };
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Stage 1: Match active teacher assignments
      {
        $match: {
          teacherId: new ObjectId(userId),
          isActive: true,
        },
      },
      // Stage 2: Lookup the class details
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classData",
        },
      },
      // Stage 3: Unwind class data
      {
        $unwind: "$classData",
      },
      // Stage 4: Filter by school and other conditions
      {
        $match: {
          "classData.schoolId": new ObjectId(userSchoolId),
          "classData.isDeleted": false,
          ...(query.status && { "classData.status": query.status }),
          ...(query.search && {
            "classData.name": { $regex: query.search, $options: "i" },
          }),
        },
      },
      // Stage 5: Replace root with class document
      {
        $replaceRoot: { newRoot: "$classData" },
      },
      // Stage 6: Sort
      {
        $sort: query.$sort || { createdAt: -1 },
      },
    ];

    // Pagination defaults
    const limit = query.$limit || 10;
    const skip = query.$skip || 0;

    // Create a copy of pipeline for count
    const countPipeline = [...pipeline, { $count: "total" }];

    // Add pagination to main pipeline
    pipeline.push({ $skip: Number(skip) }, { $limit: Number(limit) });

    // Execute aggregation
    const classTeachersService = this.app.service("class-teachers") as any;
    const classTeachersModel = classTeachersService.Model;
    const [classes, countResult] = await Promise.all([
      classTeachersModel.aggregate(pipeline).exec(),
      classTeachersModel.aggregate(countPipeline).exec(),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      total,
      limit,
      skip,
      data: classes,
    };
  }

  /**
   * Get a specific class - verify teacher has access
   */
  async get(id: Id, params?: Params): Promise<any> {
    // Get userId and schoolId from authenticated user
    if (!params?.user) {
      throw new BadRequest("Authentication required");
    }

    if (!params?.user?.schoolId) {
      throw new BadRequest("User must be authenticated with a valid school");
    }

    const userId = params.user._id;
    const userSchoolId = params.user.schoolId;

    // Verify teacher is assigned to this class
    const classTeacherService = this.app.service("class-teachers") as any;
    const assignment = await classTeacherService.find({
      ...params,
      query: {
        classId: id,
        teacherId: userId,
        isActive: true,
        $limit: 1,
      },
      paginate: false,
    });

    if (!assignment || assignment.length === 0) {
      throw new NotFound("Class not found or you do not have access to this class");
    }

    // Get the class data
    const classData = await this.Model.findOne({
      _id: id,
      isDeleted: false,
      schoolId: userSchoolId,
    }).lean();

    if (!classData) {
      throw new NotFound("Class not found");
    }

    return classData;
  }
}

