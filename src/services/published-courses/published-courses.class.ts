import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import encode from "../../utils/encode";
import { generateRandomString } from "../../utils/utilities";
import configuration from "@feathersjs/configuration";
import { addCourseIdForVideoProcessing } from "../../processors";
import createCoursesModel from "../../models/courses.model";
const { aws } = configuration()();

export class PublishedCourses extends Service {
  app: Application;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: any): Promise<any> {
    const { courseId } = params.query;
    switch (params?.query?.action) {
    case "getCourseById":
      return this.Model.findOne({
        mainCourse: courseId,
      });
    }
    return {};
  }

  async create(
    course: Partial<any> | Partial<any>[] | any,
    _params?: Params | undefined
  ): Promise<any> {
    try {
      // Verify if already course available or not
      const publishedCourse: any = await this.Model.findOne({
        mainCourse: course._id,
      });

      const payload = this.getCoursePayload(course);

      let updatedCourse;
      if (publishedCourse) {
        updatedCourse = await this.Model.findByIdAndUpdate(
          publishedCourse._id,
          payload,
          {
            returnDocument: "after",
          }
        );
      } else {
        updatedCourse = await this.Model.create(payload);
      }

      // start video conversion
      // convertVideos(courseEncodeVideos, this.Model);
      // processVideosOfCourse(course._id);
      await addCourseIdForVideoProcessing(course._id);

      return updatedCourse;
    } catch (e) {
      throw e;
    }
  }

  // Create new PATCH method to handle course updates
  async patch(courseId: any, data: any, _params?: any) {
    try {
      // Fetch complete course details from main courses model
      const course: any = await createCoursesModel(this.app)
        .findById(courseId)
        .lean();

      if (!course) {
        throw new Error("Course not found");
      }

      // Verify if already course available or not
      const publishedCourse: any = await this.Model.findOne({
        mainCourse: course._id,
      });

      const payload = this.getCoursePayload(course);

      // Include the courseHash from main course
      payload.courseHash = course.courseHash;

      // Merge with any additional data from PATCH request
      const updatePayload = { ...payload, ...data };

      let updatedCourse;
      if (publishedCourse) {
        updatedCourse = await this.Model.findByIdAndUpdate(
          publishedCourse._id,
          updatePayload,
          {
            returnDocument: "after",
          }
        );
      } else {
        updatedCourse = await this.Model.create(updatePayload);
      }

      if (payload.status !== "approved") {
        await createCoursesModel(this.app).findByIdAndUpdate(
          course._id,
          {
            status: "approved",
          },
          {
            returnDocument: "after",
          }
        );
      }

      // Start video conversion
      // convertVideos(courseEncodeVideos, this.Model);
      // processVideosOfCourse(course._id);
      await addCourseIdForVideoProcessing(course._id);

      return updatedCourse;
    } catch (error) {
      throw error;
    }
  }

  getCoursePayload(course: any) {
    return {
      mainCourse: course._id,
      title: course.title,
      category: course.category,
      courseDescription: course.courseDescription,
      difficultyLevel: course.difficultyLevel,
      owner: course.owner,
      learnings: course.learnings,
      authors: course?.authors,
      outline: course?.outline,
      courseImage: course?.courseImage,
      certificateDetails: course?.certificateDetails ?? {},
      accuracy: course?.accuracy,
      deleted: course?.deleted,
      last_status_changed_at: course?.last_status_changed_at,
      lastReleaseDate: course?.lastReleaseDate,
      courseHash: course?.courseHash,
      status: course?.status,
      classId: course?.classId,
      createdAt: course?.createdAt,
      updatedAt: course?.updatedAt,
    };
  }
}

const convertVideos = async (course: any, Model: any) => {
  try {
    // set status to video conversion started
    await Model.findByIdAndUpdate(
      course._id,
      { videoProcessing: "started" },
      {
        returnDocument: "after",
      }
    );

    const { outline } = course;
    for (const outlineItem of outline) {
      if (outlineItem.category === "module") {
        // Process lessons within modules
        const { lessons } = outlineItem;
        for (const lesson of lessons) {
          if (
            typeof lesson?.resource?.fileType == "string" &&
            lesson?.resource?.fileType.includes("video")
          ) {
            const { objectUrl } = lesson.resource;
            const uploadId = generateRandomString(16);
            const playlistS3Url = `https://${aws.cloudFrontUrl}/${uploadId}.m3u8`;
            await encode(objectUrl, uploadId);
            lesson.resource.playlistUrl = playlistS3Url;
          }
        }
      } else if (outlineItem.category === "lesson") {
        // Process standalone lesson
        if (
          typeof outlineItem?.resource?.fileType == "string" &&
          outlineItem?.resource?.fileType.includes("video")
        ) {
          const { objectUrl } = outlineItem.resource;
          const uploadId = generateRandomString(16);
          const playlistS3Url = `https://${aws.cloudFrontUrl}/${uploadId}.m3u8`;
          await encode(objectUrl, uploadId);
          outlineItem.resource.playlistUrl = playlistS3Url;
        }
      }
    }

    // set status to video conversion finished
    await Model.findByIdAndUpdate(
      course._id,
      { outline, videoProcessing: "finished" },
      {
        returnDocument: "after",
      }
    );
  } catch (err) {
    // set status to video conversion failed
    console.log(err);
    await Model.findByIdAndUpdate(
      course._id,
      { videoProcessing: "error" },
      {
        returnDocument: "after",
      }
    );
  }
};







