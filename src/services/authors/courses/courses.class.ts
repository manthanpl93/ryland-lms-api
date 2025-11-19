import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import createPublishedCoursesModel from "../../../models/published-courses.model";
import { BadRequest } from "@feathersjs/errors";
import {
  updateCourseWithHash,
  validateCoursePermissions,
} from "../../../utils/course-utils";
import {
  ICreateAuthorCourseRequest,
  IUpdateAuthorCourseRequest,
  IAuthorCoursesListResponse,
  IAuthorCourseSearchParams,
} from "./courses.types";

export class AuthorCourses extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: ICreateAuthorCourseRequest): Promise<any> {
    try {
      // Validate required fields
      if (!data.title) {
        throw new BadRequest("Course title is required");
      }

      // Validate classId is provided
      if (!data.classId) {
        throw new BadRequest("Class ID is required");
      }

      // Create course with default values
      const courseData = {
        ...data,
        status: data.status || "draft",
        outline: data.outline || [],
      };

      const course: any = await createCoursesModel(this.app).create(courseData);

      return course;
    } catch (error) {
      console.error("Author course create error:", error);
      throw error;
    }
  }

  async find(params?: any): Promise<IAuthorCoursesListResponse> {
    try {
      const {
        skip = 0,
        limit = 10,
        filters: statusFilters,
        searchText,
        classId,
      }: IAuthorCourseSearchParams = params?.query || {};

      const userId = params?.user?._id;
      const userRole = params?.user?.role;
      const userSchoolId = params?.user?.schoolId;
      const isTeacher = userRole === "Teacher";
      
      if (!userId) {
        throw new BadRequest("User authentication required");
      }

      // For Teacher role, use aggregation approach to get all courses from assigned classes
      if (isTeacher) {
        return this.findCoursesForTeacher(
          userId,
          userSchoolId,
          skip,
          limit,
          statusFilters,
          searchText,
          classId,
          params
        );
      }

      // For Admin/other roles, use the original approach
      // Build search query
      let searchQuery = {};
      if (searchText) {
        const rgx = (pattern: any) => new RegExp(`.*${pattern}.*`);
        const searchRgx = rgx(searchText);
        searchQuery = { title: { $regex: searchRgx, $options: "i" } };
      }

      // Build base filter
      const filter: any = {
        $and: [
          {
            $or: [{ deleted: { $exists: false } }, { deleted: { $ne: true } }],
          },
        ],
        ...searchQuery,
      };

      if (statusFilters?.length) {
        filter["status"] = { $in: statusFilters };
      }

      // ClassId is required for admin
      if (!classId) {
        throw new BadRequest("Class ID is required");
      }

      const classService = this.app.service("classes");
      const classData = await classService.get(classId, { ...params });

      if (!classData) {
        throw new BadRequest("Class not found");
      }

      // Check if user belongs to the same school as the class
      const isSameSchool = classData.schoolId?.toString() === userSchoolId?.toString();

      if (!isSameSchool) {
        throw new BadRequest("You don't have access to this class");
      }

      // Apply classId filter
      filter["classId"] = classId;
      
      const courses = await createCoursesModel(this.app)
        .find(filter)
        .lean()
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .exec();
      console.log("courses", courses);
      
      // Get video processing status for approved courses
      const publishedCoursesModel = createPublishedCoursesModel(this.app);
      const approvedCourses: any[] = await publishedCoursesModel.find({
        mainCourse: { $in: courses.map((el: any) => el._id) },
        $or: [
          { videoProcessing: { $exists: false } },
          { videoProcessing: { $ne: "finished" } },
        ],
      });
      console.log("approvedCourses", approvedCourses);
      
      // Add video processing progress to courses
      await this.addVideoProcessingProgress(courses, approvedCourses);

      const total = await createCoursesModel(this.app).countDocuments(filter);

      return {
        data: courses,
        skip: Number(skip),
        limit: Number(limit),
        total,
      };
    } catch (error) {
      console.error("Author courses find error:", error);
      throw error;
    }
  }

  /**
   * Find courses for teacher using aggregation
   * This allows teachers to see all courses from all their assigned classes
   */
  private async findCoursesForTeacher(
    userId: any,
    userSchoolId: any,
    skip: number,
    limit: number,
    statusFilters: string[] | undefined,
    searchText: string | undefined,
    classId: string | undefined,
    params: any
  ): Promise<IAuthorCoursesListResponse> {
    const mongoose = this.app.get("mongooseClient");
    const ObjectId = mongoose.Types.ObjectId;

    // Build match conditions for courses
    const courseMatchConditions: any = {
      $or: [{ deleted: { $exists: false } }, { deleted: { $ne: true } }],
    };

    if (searchText) {
      courseMatchConditions.title = { 
        $regex: searchText, 
        $options: "i" 
      };
    }

    if (statusFilters?.length) {
      courseMatchConditions.status = { $in: statusFilters };
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
      // Stage 4: Filter by school (ensure teacher only sees courses from their school)
      {
        $match: {
          "classData.schoolId": new ObjectId(userSchoolId),
        },
      },
      // Stage 5: Lookup courses for this class
      {
        $lookup: {
          from: "courses",
          let: { classIdVar: "$classId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$classId", "$$classIdVar"] },
                    courseMatchConditions.deleted 
                      ? { $or: courseMatchConditions.deleted.$or }
                      : { $expr: true },
                  ],
                },
                ...(searchText && { title: courseMatchConditions.title }),
                ...(statusFilters?.length && { status: courseMatchConditions.status }),
              },
            },
          ],
          as: "courses",
        },
      },
      // Stage 6: Unwind courses
      {
        $unwind: "$courses",
      },
      // Stage 7: Replace root with course document
      {
        $replaceRoot: { newRoot: "$courses" },
      },
      // Stage 8: Sort by creation date
      {
        $sort: { createdAt: -1 },
      },
    ];

    // If specific classId is provided, filter by it
    if (classId) {
      // First verify teacher has access to this class
      const classTeacherService = this.app.service("class-teachers");
      const assignment = await classTeacherService.find({
        ...params,
        query: {
          classId: classId,
          teacherId: userId,
          isActive: true,
          $limit: 1,
        },
        paginate: false,
      });

      if (!assignment || assignment.length === 0) {
        throw new BadRequest("You don't have access to courses in this class");
      }

      // Add classId filter to the beginning
      pipeline[0].$match.classId = new ObjectId(classId);
    }

    // Create a copy of pipeline for count
    const countPipeline = [...pipeline, { $count: "total" }];

    // Add pagination to main pipeline
    pipeline.push(
      { $skip: Number(skip) },
      { $limit: Number(limit) }
    );

    // Execute aggregation
    const classTeachersModel = this.app.service("class-teachers").Model;
    const [courses, countResult] = await Promise.all([
      classTeachersModel.aggregate(pipeline).exec(),
      classTeachersModel.aggregate(countPipeline).exec(),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    console.log("courses (teacher aggregation)", courses);

    // Get video processing status for approved courses
    if (courses.length > 0) {
      const publishedCoursesModel = createPublishedCoursesModel(this.app);
      const approvedCourses: any[] = await publishedCoursesModel.find({
        mainCourse: { $in: courses.map((el: any) => el._id) },
        $or: [
          { videoProcessing: { $exists: false } },
          { videoProcessing: { $ne: "finished" } },
        ],
      });
      console.log("approvedCourses", approvedCourses);

      // Add video processing progress to courses
      await this.addVideoProcessingProgress(courses, approvedCourses);
    }

    return {
      data: courses,
      skip: Number(skip),
      limit: Number(limit),
      total,
    };
  }

  /**
   * Helper method to add video processing progress to courses
   */
  private async addVideoProcessingProgress(
    courses: any[],
    approvedCourses: any[]
  ): Promise<void> {
    for (const course of approvedCourses) {
      const courseId = course.mainCourse;
      const authorCourse: any = courses.find((el: any) =>
        el._id.equals(courseId)
      );

      if (!authorCourse) continue;

      if (course.videoProcessing === "error") {
        authorCourse.videoProcessingProgress = {
          error: true,
        };
        continue;
      }

      let total = 0;
      let completed = 0;
      const { outline } = course;

      for (const outlineItem of outline) {
        if (outlineItem.category === "module") {
          // Process lessons within modules
          const { lessons } = outlineItem;
          for (const lesson of lessons) {
            if (lesson.type === "video") {
              total++;
              if (lesson.resource?.playlistUrl) completed++;
            }
          }
        } else if (outlineItem.category === "lesson") {
          // Process standalone lessons
          if (outlineItem.type === "video") {
            total++;
            if (outlineItem.resource?.playlistUrl) completed++;
          }
        }
      }

      if (total > 0) {
        authorCourse.videoProcessingProgress = {
          processing: true,
          progress: (completed / total) * 100,
        };
      }
    }
  }

  async patch(
    id: any,
    data: IUpdateAuthorCourseRequest,
    params?: any
  ): Promise<any> {
    try {
      // Verify user has permission to update this course
      const existingCourse: any = await createCoursesModel(this.app)
        .findById(id)
        .lean();

      if (!existingCourse) {
        throw new BadRequest("Course not found");
      }
      console.log(params);
      const userId = params?.user?._id;
      const userRole = params?.user?.role || "";

      if (!validateCoursePermissions(existingCourse, userId, userRole)) {
        throw new BadRequest("You don't have permission to update this course");
      }

      // If outline is being updated, use the utility function
      if (data.outline) {
        await updateCourseWithHash(this.app, id, data.outline, data);
        return await createCoursesModel(this.app).findById(id).exec();
      }

      // For non-outline updates, use regular update
      const updatedCourse = await createCoursesModel(this.app)
        .findByIdAndUpdate(id, { $set: data }, { new: true })
        .exec();

      return updatedCourse;
    } catch (error) {
      console.error("Author course patch error:", error);
      throw error;
    }
  }

  // Helper method to determine if this is a content update
  private isContentUpdate(data: any): boolean {
    const contentFields = [
      "title",
      "learnings",
      "courseImage",
      "outline",
      "certificateDetails",
    ];
    return contentFields.some((field) => data.hasOwnProperty(field));
  }
}
