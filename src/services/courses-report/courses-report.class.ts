import { Params } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import coursesModel from "../../models/courses.model";
import studentProgressModel from "../../models/student-progress.model";
import { getLastWeekCourseCompletionReport } from "../../scheduler/weeklyReport";

export class CoursesReport {
  app: Application;
  constructor(app: Application) {
    this.app = app;
  }
  async find(params: Params): Promise<any> {
    try {
      const { page = 0, limit = 5, filter = {} }: any = params.query;
      const queryFilter: any = {};
      // Note: Authors/owner filter removed - access now controlled via class-teachers
      // if (filter?.authors?.length) {
      //   queryFilter["$or"] = [
      //     { authors: { $in: filter?.authors } },
      //     { owner: { $in: filter?.authors } },
      //   ];
      // }
      if (filter?.status && filter?.status != "all") {
        queryFilter["status"] = filter?.status;
      }
      if (filter?.search) {
        queryFilter["title"] = {
          $regex: new RegExp(filter?.search, "i"),
        };
      }

      const baseQuery = {
        ...queryFilter,
        $or: [{ deleted: { $exists: false } }, { deleted: { $ne: true } }],
      };

      const courses: any = await coursesModel(this.app)
        .find(baseQuery)
        .limit(Number(limit))
        .skip(Number(page) * Number(limit))
        .sort({ _id: -1 })
        .populate("enrolledCourses")
        .lean();

      for (const course of courses) {
        course["totalParticipants"] = course?.enrolledCourses?.length;
        course["totalCompleted"] = await studentProgressModel(this.app).count({
          courseId: course?._id,
          completedAt: { $exists: true },
        });
      }
      const total: number = await coursesModel(this.app).count(baseQuery);
      return {
        reports: courses,
        total: total,
        limit,
        skip: page * limit,
      };
    } catch (error) {
      throw error;
    }
  }
}
export class CoursesWeeklyReport {
  app: Application;
  constructor(app: Application) {
    this.app = app;
  }
  async find(): Promise<any> {
    try {
      await getLastWeekCourseCompletionReport(true);
      return { message: "Weekly report sent to the HR emails" };
    } catch (error) {
      throw error;
    }
  }
}
