import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import coursePreviewModel from "../../models/course-preview.model";
import coursesModel from "../../models/courses.model";
import createApprovedCoursesModel from "../../models/approved-courses.model";
import { BadRequest } from "@feathersjs/errors";
import usersModel from "../../models/users.model";
import { triggerNotifications } from "../../utils/notification-manager/action-gateway";
import { NotificationConstants } from "../../utils/constants";

interface Body {
  courseId: string;
}

export class EnrolCourse extends Service {
  app: Application;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async create(data: Body, params?: Params | undefined): Promise<any> {
    try {
      const user = params?.user;
      const { courseId = "" } = data;
      const course = await createApprovedCoursesModel(this.app)
        .findOne({
          mainCourse: courseId,
        })
        .lean();

      console.log(course, "course");
      if (!course) {
        throw new BadRequest("No course found");
      }
      const courseEnrolled = await coursePreviewModel(this.app).findOne({
        userId: user?._id,
        courseId: courseId,
      });
      if (courseEnrolled) {
        return courseEnrolled;
      }
      const coursePreview = await coursePreviewModel(this.app).create({
        progressHistory: [],
        userId: user?._id,
        courseId: courseId,
      });

      triggerNotifications({
        notificationTypes: [
          NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME,
          NotificationConstants.AUTHOR_NOTIFICATION_TYPES.STUDENT_ENROLLED,
        ],
        studentId: user?._id,
        courseId: courseId,
      });

      return coursePreview;
    } catch (error) {
      throw error;
    }
  }
}

// temp code
// const courseModules = course?.modules;
// let progressHistory: any[] = [];
// courseModules?.forEach((module) => {
//   let courseModule: any = {
//     moduleId: module?._id,
//     lessons: [],
//   };
//   module?.lessons?.forEach((lesson) => {
//     let moduleLesson = {
//       lessonId: lesson._id,
//     };
//     courseModule.lessons.push(moduleLesson);
//   });
//   progressHistory.push(courseModule);
// });
