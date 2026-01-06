import { BadRequest } from "@feathersjs/errors";
import { Application } from "../../../declarations";
import createCoursesModel from "../../../models/courses.model";
import createPublishedCoursesModel from "../../../models/published-courses.model";
import moment from "moment-timezone";
import mongoose from "mongoose";
import { analyzeDetailedChanges } from "../publish-lib";
import { IPublishChangesResponse } from "../../../types/courses.types";
import { copyS3File } from "../../../utils/utilities";
import studentProgressModel from "../../../models/student-progress.model";
import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import util from "node:util";
import {
  AdminCourseParams,
  AdminCourseData,
  AdminCourseFindResponse,
  CourseReportQueryOptions,
  CourseReportHandlerResponse,
  CheckChangesResponse,
  CloneCourseResponse,
  AdminCourseResponse,
  AdminDeleteResponse,
  AdminCoursesQueryOptions,
  CourseModel,
} from "../types";
import { checkCourseChanges, updateCourseContent } from "./commonCourseHandlers";

/**
 * Admin GET handler - fetch a single course with all details
 */
export const adminGet = async (
  id: string,
  data: null,
  params: AdminCourseParams,
  app: Application
): Promise<AdminCourseResponse> => {
  try {
    const course = await createCoursesModel(app)
      .findById(id)
      .populate("enrolledCourses");
    if (!course) {
      throw new BadRequest("No course found");
    }
    return course as AdminCourseResponse;
  } catch (error) {
    throw error;
  }
};

/**
 * Admin FIND handler - search and list courses
 */
export const adminFind = async (
  id: null,
  data: null,
  params: AdminCourseParams,
  app: Application
): Promise<
  | AdminCourseFindResponse
  | CourseReportHandlerResponse
  | CheckChangesResponse
  | IPublishChangesResponse
> => {
  const { controller } = params?.query || {};

  if (controller === "course-report") {
    return getCourseReport(params, app);
  }

  if (controller === "check-changes") {
    const courseId = params?.query?.courseId;
    if (!courseId) {
      throw new BadRequest("courseId is required to check course changes");
    }
    return checkCourseChanges(courseId, params, app);
  }

  if (controller === "get-publish-changes") {
    const courseId = params?.query?.courseId;
    if (!courseId) {
      throw new BadRequest("courseId is required to fetch publish changes");
    }
    return getPublishChanges(courseId, params, app);
  }

  // Default find - get admin courses with filters
  return getAdminCourses(params, createCoursesModel(app));
};

/**
 * Admin CREATE handler - create a new course
 */
export const adminCreate = async (
  id: null,
  data: AdminCourseData,
  params: AdminCourseParams,
  app: Application
): Promise<AdminCourseResponse> => {
  try {
    const coursesModel = createCoursesModel(app);
    const course: any = await coursesModel.create(data);

    return course as AdminCourseResponse;
  } catch (e) {
    console.log("Course create error", e);
    throw e;
  }
};

/**
 * Admin PATCH handler - update course or perform specific operations
 */
export const adminPatch = async (
  id: string,
  data: AdminCourseData,
  params: AdminCourseParams,
  app: Application
): Promise<AdminCourseResponse | CloneCourseResponse> => {
  const { controller } = data;

  if (controller) {
    switch (controller) {
    case "update-certificate-details":
      return updateCourseCertificateDetails(id, data, params, app);
    case "clone-course":
      return cloneCourse(id, params, app);
    case "delete-course":
      return deleteCourse(id, app);
    }
  }

  return updateCourseContent(id, data, app);
};

/**
 * Admin DELETE handler - soft delete a course
 */
export const adminDelete = async (
  id: string,
  data: null,
  params: AdminCourseParams,
  app: Application
): Promise<AdminDeleteResponse> => {
  try {
    return await deleteCourse(id, app);
  } catch (error) {
    throw error;
  }
};

// ============ Helper Functions ============

/**
 * Helper to determine if this is a content update
 */
/**
 * Get admin courses from all classes in the school
 */
const getAdminCourses = async (
  params: AdminCourseParams,
  coursesModel: CourseModel
): Promise<AdminCourseFindResponse> => {
  const query = (params?.query || {}) as AdminCoursesQueryOptions;
  const { searchText, classId, skip = 0, limit = 10 } = query;
  const user = params?.user;

  // classId is required
  if (!classId) {
    throw new BadRequest("classId is required to fetch courses");
  }

  // Validate classId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new BadRequest("Invalid classId format");
  }

  const filter: any = {
    classId: new mongoose.Types.ObjectId(classId),
    $and: [
      { $or: [{ deleted: { $exists: false } }, { deleted: { $ne: true } }] },
    ],
  };

  // Filter by school
  if (user?.school) {
    filter["school"] = user.school;
  }

  // Filter by search text
  if (searchText) {
    filter["title"] = { $regex: new RegExp(searchText, "i") };
  }

  const records: any = await coursesModel
    .find(filter)
    .limit(Number(limit))
    .skip(Number(skip))
    .sort({ last_status_changed_at: -1 })
    .exec();

  const total: any = await coursesModel.countDocuments(filter);

  return {
    data: records,
    skip: Number(skip),
    limit: Number(limit),
    total,
  };
};

/**
 * Get detailed publish changes
 */
const getPublishChanges = async (
  courseId: string,
  params: AdminCourseParams,
  app: Application
): Promise<IPublishChangesResponse> => {
  try {
    const publishedCoursesModel = createPublishedCoursesModel(app);

    // Fetch the main course
    const course: any = await createCoursesModel(app).findById(courseId).lean();

    if (!course) {
      throw new BadRequest("Course not found");
    }

    // Check if course has been published before
    const publishedCourse: any = await publishedCoursesModel
      .findOne({ mainCourse: courseId })
      .lean();

    // Case 1: Course not yet published
    if (!publishedCourse) {
      return {
        coursePublished: false,
        hasChanges: false,
      };
    }

    // Case 2: Course published - compare hashes
    const hasChanges = course.courseHash !== publishedCourse.courseHash;

    if (!hasChanges) {
      // Case 3: No changes detected
      return {
        coursePublished: true,
        hasChanges: false,
      };
    }

    // Case 4: Changes detected - perform detailed analysis
    const changesByCategory = await analyzeDetailedChanges(
      course,
      publishedCourse
    );

    return {
      coursePublished: true,
      hasChanges: true,
      changesByCategory,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Clone a course
 */
const cloneCourse = async (
  courseId: string,
  params: AdminCourseParams,
  app: Application
): Promise<CloneCourseResponse> => {
  try {
    const coursesModel = createCoursesModel(app);
    const course: any = await coursesModel.findById(courseId).lean();
    const outline: any[] = [...course?.outline];
    const outlineCopy: any[] = [];

    // Helper function to clone a lesson
    const cloneLesson = async (lesson: any) => {
      const lessonCopy: any = {
        title: lesson?.title,
        category: "lesson",
        type: "pdf",
      };

      if (lesson?.contentType == "text") {
        lessonCopy["contentType"] = lesson?.contentType;
        lessonCopy["content"] = lesson?.content;
      } else if (lesson?.contentType == "media") {
        lessonCopy["contentType"] = lesson?.contentType;
        const resource: any = { ...lesson?.resource };

        // Use reusable S3 copy function
        const { newFileUrl } = await copyS3File(resource?.objectUrl);
        const copyResource = { ...resource };
        copyResource["objectUrl"] = newFileUrl;
        lessonCopy["resource"] = copyResource;
      }

      return lessonCopy;
    };

    for (const outlineItem of outline) {
      if (outlineItem.category === "module") {
        // Clone module with its lessons
        const moduleCopy: any = {
          title: outlineItem?.title,
          category: "module",
          lessons: [],
        };

        for (const lesson of outlineItem?.lessons) {
          const lessonCopy = await cloneLesson(lesson);
          moduleCopy?.lessons?.push(lessonCopy);
        }
        outlineCopy.push(moduleCopy);
      } else if (outlineItem.category === "lesson") {
        // Clone standalone lesson
        const lessonCopy = await cloneLesson(outlineItem);
        outlineCopy.push(lessonCopy);
      }
    }
    const copyCourse = await coursesModel.create({
      title: `${course?.title} copy`,
      learnings: course?.learnings,
      accuracy: course?.accuracy,
      status: "draft",
      assignments: course?.assignments,
      isReadyForPreview: true,
      outline: outlineCopy,
      courseDescription: course?.courseDescription,
      courseImage: course?.courseImage,
      certificateDetails: course?.certificateDetails || {},
    });
    return copyCourse?._id;
  } catch (error) {
    console.log("Clone error", error);
    throw error;
  }
};

/**
 * Soft delete a course
 */
const deleteCourse = async (
  courseId: string,
  app: Application
): Promise<AdminDeleteResponse> => {
  try {
    const coursesModel = createCoursesModel(app);
    const publishedCoursesModel = createPublishedCoursesModel(app);

    const deletedCourse = await coursesModel
      .findByIdAndUpdate(
        courseId,
        {
          deleted: true,
          expirationDate: new Date(
            new Date().setDate(new Date().getDate() + 30)
          ),
        },
        {
          returnDocument: "after",
        }
      )
      .lean();
    await publishedCoursesModel.findOneAndUpdate(
      {
        mainCourse: deletedCourse?._id,
      },
      {
        deleted: true,
        expirationDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      }
    );
    return deletedCourse as AdminDeleteResponse;
  } catch (error) {
    throw error;
  }
};

/**
 * Update course certificate details
 */
const updateCourseCertificateDetails = async (
  courseId: string,
  data: AdminCourseData,
  params: AdminCourseParams,
  app: Application
): Promise<AdminCourseResponse> => {
  const coursesModel = createCoursesModel(app);
  const updated = await coursesModel.findByIdAndUpdate(
    courseId,
    { certificateDetails: data?.details },
    { returnDocument: "after" }
  );
  return updated as AdminCourseResponse;
};

/**
 * Get course report with student data
 */
const getCourseReport = async (
  params: AdminCourseParams,
  app: Application
): Promise<CourseReportHandlerResponse> => {
  try {
    const query = (params?.query || {}) as CourseReportQueryOptions;
    const {
      courseId,
      filters,
      searchText,
      limit = 0,
      skip = 0,
      completionDateRage = {},
      enrolledDateRange = {},
      courseReportExport = false,
    } = query;
    if (!courseId) {
      throw new BadRequest("courseId is required to generate course report");
    }
    const { certificateAvailability, completed } = filters ?? {};

    const coursesModel = createCoursesModel(app);

    const course: any = await coursesModel
      .findById(courseId)
      .select("_id title courseDescription status courseImage")
      .lean();

    const previewFilters: any = [];
    const usersFilter: any = [];

    if (filters?.enrolledOn?.from && filters?.enrolledOn?.to) {
      previewFilters.push({
        $match: {
          joinedDate: {
            $gte: new Date(filters.enrolledOn.from),
            $lt: new Date(filters.enrolledOn.to),
          },
        },
      });
    }

    if (filters?.completedOn?.from && filters?.completedOn?.to) {
      previewFilters.push({
        $match: {
          completedAt: {
            $gte: new Date(filters.completedOn.from),
            $lt: new Date(filters.completedOn.to),
          },
        },
      });
    }
    if (enrolledDateRange?.startDate && enrolledDateRange?.endDate) {
      const startDate = moment(enrolledDateRange.startDate as string | Date)
        .utc()
        .startOf("day");
      const endDate = moment(enrolledDateRange.endDate as string | Date).utc().endOf("day");
      previewFilters.push({
        $match: {
          joinedDate: {
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

    if (completed != "all") {
      if (completed == "yes") {
        previewFilters.push({
          $match: {
            completedAt: { $ne: null },
          },
        });
      } else if (completed == "no") {
        previewFilters.push({
          $match: {
            $or: [
              { completedAt: { $exists: false } },
              { completedAt: null },
            ],
          },
        });
      }
    }

    if (completionDateRage?.startDate && completionDateRage?.endDate) {
      const startDate = moment(completionDateRage.startDate as string | Date)
        .utc()
        .startOf("day");
      const endDate = moment(completionDateRage.endDate as string | Date).utc().endOf("day");
      previewFilters.push({
        $match: {
          completedAt: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
        },
      });
    }

    const allStudentProgress: any = await studentProgressModel(app)
      .find({ courseId })
      .select("_id completedAt")
      .lean();

    const courseAssessmentCompletedCount = await studentProgressModel(app).count({
      courseId,
      completedAt: { $ne: null },
    });

    const aggregationPipeline = [
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      ...previewFilters,
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

    let studentProgressRecords: any = studentProgressModel(app).aggregate(
      aggregationPipeline
    );

    if (limit) {
      studentProgressRecords = studentProgressRecords.skip(Number(skip)).limit(Number(limit));
    }

    studentProgressRecords = await studentProgressRecords;

    const totalDocCount: any = await studentProgressModel(app).aggregate([
      ...aggregationPipeline,
      {
        $count: "count",
      },
    ]);

    const studentsReport = [];

    for (const p of studentProgressRecords) {
      const user_data = p.user_data[0];
      const location_data = p.location_data[0];

      if (!user_data) continue;

      // Skip if isCertificateAvailable filter is enabled
      if (
        (certificateAvailability == "yes" && !p?.certificateUrl) ||
        (certificateAvailability == "no" && p?.certificateUrl)
      )
        continue;

      studentsReport.push({
        _id: user_data?._id,
        studentName: `${user_data?.name} ${
          p?.user_data ? user_data.lastName ?? "" : ""
        }`,
        designation: user_data?.designation,
        location: location_data?.name,
        locationId: location_data?._id,
        enrolledOn: p.joinedDate,
        completedOn: p?.completedAt,
        certificateAvailable: !!p?.certificateUrl,
        certificateUrl: p?.certificateUrl ?? "",
      });
    }
    if (courseReportExport) {
      const date = new mongoose.Types.ObjectId().toString();
      const reportExcelFormatted = studentsReport.map((report) => ({
        Student_Name: report?.studentName,
        Designation: report?.designation,
        Location: report?.location,
        Enrolled_Date: report?.enrolledOn
          ? moment(report?.enrolledOn)
            .tz("America/New_York")
            .format("DD MMM YYYY")
          : "",
        Completed_Date: report?.completedOn
          ? moment(report?.completedOn)
            .tz("America/New_York")
            .format("DD MMM YYYY")
          : "",
        Certificate: report?.certificateAvailable ? "Yes" : "No",
        Certificate_Link: report?.certificateUrl,
      }));

      const workbook = xlsx.utils.book_new();
      const workSheet = xlsx.utils.json_to_sheet(reportExcelFormatted);
      xlsx.utils.book_append_sheet(
        workbook,
        workSheet,
        "Student_course_report"
      );
      const dirPath = path.join("public", "studentReports");
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file: any) => {
          const curPath = dirPath + "/" + file;
          fs.unlinkSync(curPath);
        });
      }
      fs.mkdirSync(dirPath, { recursive: true });

      const filePath = path.join(
        "public",
        `studentReports/report_${date}.xlsx`
      );
      const writeFile: any = util.promisify(xlsx.writeFileAsync);
      await writeFile(filePath, workbook, {
        type: "buffer",
      });

      return {
        result: date,
      } as CourseReportHandlerResponse;
    }
    return {
      ...course,
      totalParticipants: allStudentProgress.length,
      totalCompleted: courseAssessmentCompletedCount,
      studentsReport,
      total: Array.isArray(totalDocCount) ? totalDocCount[0]?.count : 0,
    } as CourseReportHandlerResponse;
  } catch (e) {
    console.log(e);
    throw e;
  }
};

