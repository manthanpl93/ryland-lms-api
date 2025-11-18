import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Id, NullableId, Paginated, Params } from "@feathersjs/feathers";
import createApprovedCoursesModel from "../../models/approved-courses.model";
import coursePreviewModel from "../../models/course-preview.model";
import { BadRequest } from "@feathersjs/errors";
import { sendNotificationForCourseCompletion } from "../../utils/utilities";
import { triggerNotifications } from "../../utils/notification-manager/action-gateway";
import { NotificationConstants } from "../../utils/constants";
import moment from "moment-timezone";
import mongoose from "mongoose";

export class CoursePreview extends Service {
  app: Application;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params | any): Promise<any> {
    try {
      const { controller } = params?.query;

      console.log("preview params", params?.query);

      if (controller) {
        switch (controller) {
        case "completed-courses":
          return await this.findCompletedCourses(
            params?.user._id,
            params.query,
          );
        case "in-progress":
          return await this.findInProgressCourses(
            params?.user._id,
            params.query,
          );
        case "students-report":
          return await this.getStudentsReport(params?.query);

        default:
          throw new BadRequest("Invalid controller");
        }
      }
      return super.find(params);
    } catch (error) {
      throw error;
    }
  }

  async get(id: Id, params?: Params | undefined): Promise<any> {
    try {
      const coursePreviewId = id;
      const user = params?.user;
      const coursePreview = await coursePreviewModel(this.app)
        .findOne({
          _id: coursePreviewId,
          userId: user?._id,
        })
        .populate({
          path: "courseId",
          select:
            "_id title learnings audience authors courseDescription owner assignments",
          populate: [
            { path: "authors", strictPopulate: false, select: "name" },
            { path: "owner", strictPopulate: false, select: "name" },
          ],
          strictPopulate: false,
        })
        .lean();
      if (coursePreview) {
        const course = await createApprovedCoursesModel(this.app)
          .findOne({ mainCourse: coursePreview.courseId })
          .lean();
        const courseOutline = course?.outline ? course?.outline : [];
        const progressHistory = coursePreview?.progressHistory;
        const curriculum = [];
        for (const outlineItem of courseOutline) {
          const item: any = { ...outlineItem };
          
          if (outlineItem.category === "module") {
            // Handle module with lessons
            const moduleProgress = progressHistory?.find(
              (progress) =>
                progress.itemId.toString() == outlineItem._id.toString(),
            );
            if (moduleProgress) {
              item.progress = { ...moduleProgress };
              const lessons = item.lessons;
              const progressLessons = moduleProgress.lessons || [];
              for (const lesson of lessons) {
                const progressLesson = progressLessons.find(
                  (progress) =>
                    progress.itemId.toString() == lesson._id.toString(),
                );
                lesson.progress = { ...progressLesson };
              }
            }
          } else if (outlineItem.category === "lesson") {
            // Handle standalone lesson
            const lessonProgress = progressHistory?.find(
              (progress) =>
                progress.itemId.toString() == outlineItem._id.toString(),
            );
            if (lessonProgress) {
              item.progress = { ...lessonProgress };
            }
          }
          
          curriculum.push(item);
        }
        return {
          ...coursePreview,
          curriculum,
        };
      } else {
        throw new BadRequest("Course not found");
      }
    } catch (error) {
      console.log(error);
    }
  }

  async update(
    id: NullableId,
    data: Partial<any>,
    params?: Params | undefined,
  ): Promise<any> {
    try {
      const query: any = params?.query;
      const user: any = params?.user;
      const coursePreviewId = id;
      const coursePreview: any = await coursePreviewModel(this.app)
        .findOne({
          _id: coursePreviewId,
          userId: user?._id,
        })
        .lean();
      if (coursePreview) {
        let lecturesAttempted = coursePreview?.lecturesAttempted;
        let progressPercentage = coursePreview?.progressPercentage;
        let completedAt = coursePreview?.completedAt;
        const progressHistory = coursePreview?.progressHistory
          ? coursePreview?.progressHistory
          : [];
        if (query?.updateType == "module") {
          await this.updateModuleProgress(
            coursePreview,
            progressHistory,
            query,
            data,
          );
        } else if (query?.updateType == "lesson") {
          await this.updateLessonProgress(
            coursePreview,
            progressHistory,
            query,
            data,
          );
        }
        let completedNow = false;
        if (data?.completed && query?.updateType == "lesson") {
          if (data?.completed == "yes") {
            lecturesAttempted++;
          } else {
            lecturesAttempted--;
          }
          progressPercentage = await this.calculateProgressPercentage(
            lecturesAttempted,
            coursePreview.courseId,
          );
          if (!completedAt && progressPercentage === 100) {
            completedNow = true;
            completedAt = new Date();
          }
        }
        await coursePreviewModel(this.app).updateOne(
          {
            _id: coursePreviewId,
          },
          {
            $set: {
              progressHistory: coursePreview?.progressHistory,
              lecturesAttempted,
              progressPercentage,
              completedAt,
            },
          },
        );
        if (completedNow) {
          const courseCompletionHook = async () => {
            await sendNotificationForCourseCompletion(
              coursePreview.courseId,
              coursePreview.userId,
            );

            triggerNotifications({
              notificationTypes: [
                NotificationConstants.STUDENT_NOTIFICATION_TYPES.COMPLETION,
                NotificationConstants.AUTHOR_NOTIFICATION_TYPES
                  .STUDENT_COMPLETED,
              ],
              studentId: user?._id,
              courseId: coursePreview.courseId,
            });
          };

          courseCompletionHook();
        }
        return { updated: true };
      } else {
        throw new BadRequest("Course not found");
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async patch(
    id: NullableId,
    data: Partial<any>,
    params?: Params | undefined,
  ): Promise<any> {
    try {
      const { controller } = data;
      if (controller) {
        switch (controller) {
        case "patchCoursePreview":
          delete data?.controller;
          return await this.patchCoursePreview(id, data);
        default:
          throw new BadRequest("Invalid controller");
        }
      } else {
        return super.patch(id, data, params);
      }
    } catch (error) {
      throw error;
    }
  }

  async calculateProgressPercentage(
    lecturesAttempted: number,
    courseId: string,
  ): Promise<number> {
    let totalLessons = 0;
    const course = await createApprovedCoursesModel(this.app).findOne({
      mainCourse: courseId,
    });
    const courseOutline = course?.outline ? course.outline : [];
    for (const outlineItem of courseOutline) {
      if (outlineItem.category === "module") {
        totalLessons = totalLessons + outlineItem.lessons.length;
      } else if (outlineItem.category === "lesson") {
        totalLessons = totalLessons + 1;
      }
    }
    return Math.ceil((lecturesAttempted / totalLessons) * 100);
  }

  async updateModuleProgress(
    coursePreview: any,
    progressHistory: any = [],
    query: any,
    data: any,
  ): Promise<void> {
    const moduleExists = await createApprovedCoursesModel(this.app).exists({
      mainCourse: coursePreview.courseId,
      "outline._id": query?.itemId,
      "outline.category": "module",
    });
    if (!moduleExists) {
      throw new BadRequest("Module not found");
    }
    const moduleIndex = progressHistory.findIndex((progress: any) => {
      if (progress?.itemId) {
        return progress.itemId.toString() == query?.itemId;
      }
    });
    if (moduleIndex > -1) {
      progressHistory[moduleIndex] = {
        ...progressHistory[moduleIndex],
        ...data,
      };
    } else {
      progressHistory.push({
        itemId: query.itemId,
        category: "module",
        lessons: [],
        ...data,
      });
    }
  }

  async updateLessonProgress(
    coursePreview: any,
    progressHistory: any,
    query: any,
    data: any,
  ): Promise<void> {
    const lessonExists = await createApprovedCoursesModel(this.app).exists({
      $or: [
        {
          mainCourse: coursePreview.courseId,
          "outline.lessons._id": query?.itemId,
        },
        {
          mainCourse: coursePreview.courseId,
          "outline._id": query?.itemId,
          "outline.category": "lesson",
        },
      ],
    });
    if (!lessonExists) {
      throw new BadRequest("lesson not found");
    }
    if (data?.completed == "yes") {
      const checkCompleted = await coursePreviewModel(this.app).exists({
        _id: coursePreview?._id,
        "progressHistory.itemId": query?.itemId,
        "progressHistory.category": "lesson",
        "progressHistory.completed": "yes",
      });
      if (checkCompleted) {
        throw new BadRequest("Lesson already completed");
      }
    }
    
    let outlineItem = progressHistory.find(
      (progress: any) => progress.itemId == query?.itemId,
    );
    if (!outlineItem) {
      outlineItem = {
        itemId: query?.itemId,
        category: "lesson",
        startDate: new Date(),
        ...data,
      };
      progressHistory.push(outlineItem);
    } else {
      Object.assign(outlineItem, data);
    }
  }

  async patchCoursePreview(courseId: NullableId, data: any) {
    try {
      if (!courseId) {
        throw new BadRequest("Provide valid Id");
      }
      await coursePreviewModel(this.app).findByIdAndUpdate(courseId, data);
      return true;
    } catch (error) {
      throw error;
    }
  }

  async getStudentsReport(params: any) {
    try {
      const {
        filters,
        searchText,
        limit = 10,
        skip = 0,
        completionDateRage = {},
        enrolledDateRange = {},
      } = params;

      const previewFilters: any = [],
        usersFilter: any = [];

      if (filters?.courses && filters?.courses.length)
        previewFilters.push({
          $match: {
            courseId: {
              $in: filters?.courses.map(
                (l: any) => new mongoose.Types.ObjectId(l),
              ),
            },
          },
        });

      if (enrolledDateRange?.startDate && enrolledDateRange?.endDate) {
        const startDate = moment(enrolledDateRange.startDate)
          .utc()
          .startOf("day");
        const endDate = moment(enrolledDateRange.endDate).utc().endOf("day");
        previewFilters.push({
          $match: {
            joinedDate: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        });
      }

      if (completionDateRage?.startDate && completionDateRage?.endDate) {
        const startDate = moment(completionDateRage?.startDate)
          .utc()
          .startOf("day");
        const endDate = moment(completionDateRage?.endDate)
          .utc()
          .endOf("day");
        previewFilters.push({
          $match: {
            completedAt: {
              $gte: startDate.toDate(),
              $lte: endDate.toDate(),
            },
          },
        });
      }

      if (searchText) {
        const rgx = (pattern: any) => new RegExp(`.*${pattern}.*`);
        usersFilter.push({
          $match: {
            $or: [
              { name: { $regex: rgx(searchText), $options: "i" } },
              { email: { $regex: rgx(searchText), $options: "i" } },
              { mobileNo: { $regex: rgx(searchText), $options: "i" } },
              { lastName: { $regex: rgx(searchText), $options: "i" } },
            ],
          },
        });
      }

      if (filters?.locations && filters?.locations.length)
        usersFilter.push({
          $match: {
            location: {
              $in: filters?.locations.map(
                (l: any) => new mongoose.Types.ObjectId(l),
              ),
            },
          },
        });

      const aggregationPipeline = [
        ...previewFilters,
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course_data",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            pipeline: [...usersFilter],
            as: "user_data",
          },
        },
        { $match: { user_data: { $ne: [] } } },
        {
          $lookup: {
            from: "categories",
            localField: "user_data.location",
            foreignField: "_id",
            as: "location_data",
          },
        },
      ];

      const coursePreviews: any = await this.Model.aggregate(aggregationPipeline)
        .skip(Number(skip))
        .limit(Number(limit));

      const totalDocCount: any = await this.Model.aggregate([
        ...aggregationPipeline,
        {
          $count: "count",
        },
      ]);

      const studentsReport = [];

      for (const p of coursePreviews) {
        const user_data = p?.user_data[0];
        const location_data = p?.location_data[0];
        if (!user_data) continue;

        studentsReport.push({
          _id: user_data?._id,
          studentName: `${user_data?.name} ${
            p?.user_data ? user_data.lastName ?? "" : ""
          }`,
          designation: user_data?.designation,
          location: location_data?.name,
          locationId: location_data?._id,
          enrolledOn: p.joinedDate,
          course: p?.course_data[0],
          progressPercentage: p?.progressPercentage,
          completedOn: p?.completedAt,
          certificateAvailable: !!p?.certificateUrl,
          certificateUrl: p?.certificateUrl ?? "",
        });
      }

      return {
        studentsReport: studentsReport,
        coursePreviews,
        total: Array.isArray(totalDocCount) ? totalDocCount[0]?.count : 0,
      };
    } catch (e) {}
  }

  async findCompletedCourses(userId: any, query: any, search?: any) {
    const CoursePreview = coursePreviewModel(this.app);
    console.log("query", userId);
    const pipeline = [
      {
        $match: {
          userId,
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      {
        $unwind: {
          path: "$courseData",
          preserveNullAndEmptyArrays: false,
        },
      },
      ...(query?.title?.$regex
        ? [
          {
            $match: {
              "courseData.title": {
                $regex: query.title.$regex,
                $options: query.title.$options || "i",
              },
            },
          },
        ]
        : []),
      {
        $match: {
          progressPercentage: { $eq: 100 },
          completedAt: { $ne: null },
        },
      },
      {
        $set: {
          courseId: "$courseData",
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          data: [
            { $skip: +query.$skip || 0 },
            { $limit: +query.$limit || 8 },
          ],
        },
      },
      {
        $addFields: {
          total: { $arrayElemAt: ["$totalCount.count", 0] },
        },
      },
    ];

    const results = await CoursePreview.aggregate(pipeline);
    return results?.[0] || {};
  }

  async findInProgressCourses(userId: any, query: any, search?: any) {
    const CoursePreview = coursePreviewModel(this.app);
    console.log("query", userId);
    const pipeline = [
      {
        $match: {
          userId: userId,
        },
      },
      // Step 1: Populate courseId field from the courses collection
      {
        $lookup: {
          from: "courses", // Name of the courses collection
          localField: "courseId",
          foreignField: "_id",
          as: "courseData",
        },
      },
      {
        $unwind: {
          path: "$courseData",
          preserveNullAndEmptyArrays: false, // Ensures only matched courses are considered
        },
      },

      ...(query?.title?.$regex
        ? [
          {
            $match: {
              "courseData.title": {
                $regex: query.title.$regex,
                $options: query.title.$options || "i", // Default to case-insensitive if options aren't provided
              },
            },
          },
        ]
        : []),

      {
        $match: {
          $or: [
            { completedAt: { $exists: false } },
            { completedAt: null },
          ],
          progressPercentage: { $lt: 100 },
        },
      },
      {
        $set: {
          courseId: "$courseData",
        },
      },
      {
        $facet: {
          totalCount: [{ $count: "count" }], // Counts the total number of documents
          data: [
            { $skip: +query.$skip || 0 }, // Apply skip
            { $limit: +query.$limit || 8 }, // Apply limit
          ],
        },
      },
      {
        $addFields: {
          courseId: "$courseData",
        },
      },
      // Simplify totalCount output
      {
        $addFields: {
          total: { $arrayElemAt: ["$totalCount.count", 0] }, // Extract the total count from the array
        },
      },
    ];

    // Execute the aggregation pipeline
    const results = await CoursePreview.aggregate(pipeline);
    return results?.[0] || {};
  }
}
