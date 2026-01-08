import { Application } from "../declarations";
import { BadRequest } from "@feathersjs/errors";
import { ObjectId } from "mongodb";

/**
 * Sync communities when class forum settings change
 * Creates, updates, or deactivates communities based on forum settings
 * Returns updated forumSettings with community IDs populated
 */
export async function syncCommunities(
  classId: string,
  forumSettings: any,
  app: Application
): Promise<any> {
  const communitiesModel = app.get("mongooseClient").models.communities;
  const coursesModel = app.get("mongooseClient").models.courses;

  if (!communitiesModel) {
    throw new BadRequest("Communities model not initialized");
  }

  const updatedForumSettings = { ...forumSettings };

  // 1. Sync Class Community
  if (forumSettings.enableClassForum === true) {
    // Check if class community already exists
    if (forumSettings.classCommunityId) {
      // Ensure it's active
      await communitiesModel.findByIdAndUpdate(
        forumSettings.classCommunityId,
        { isActive: true }
      );
      updatedForumSettings.classCommunityId = forumSettings.classCommunityId;
    } else {
      // Check if a class community exists for this class
      const existingCommunity = await communitiesModel.findOne({
        classId: new ObjectId(classId),
        type: "class",
      });

      if (existingCommunity) {
        // Reactivate existing community
        existingCommunity.isActive = true;
        await existingCommunity.save();
        updatedForumSettings.classCommunityId = existingCommunity._id;
      } else {
        // Create new class community
        const newCommunity = await communitiesModel.create({
          name: "Class Community",
          type: "class",
          classId: new ObjectId(classId),
          isActive: true,
        });
        updatedForumSettings.classCommunityId = newCommunity._id;
      }
    }
  } else {
    // Disable class forum - deactivate community
    if (forumSettings.classCommunityId) {
      await communitiesModel.findByIdAndUpdate(
        forumSettings.classCommunityId,
        { isActive: false }
      );
    } else {
      // If classCommunityId is not in forumSettings, find and deactivate by classId
      await communitiesModel.updateMany(
        {
          classId: new ObjectId(classId),
          type: "class"
        },
        { isActive: false }
      );
    }
    updatedForumSettings.classCommunityId = null;
  }

  // 2. Sync Course Communities
  if (forumSettings.enableCourseForum === true) {
    let courseIds: any[] = [];

    if (forumSettings.enableAllCourses === true) {
      // Get all courses for this class
      const courses = await coursesModel
        .find({
          classId: new ObjectId(classId),
          $or: [{ deleted: false }, { deleted: { $exists: false } }],
        })
        .select("_id title")
        .lean();

      courseIds = courses.map((course: any) => course._id);
    } else if (forumSettings.selectedCourses && forumSettings.selectedCourses.length > 0) {
      // Use selected courses
      courseIds = forumSettings.selectedCourses.map((sc: any) => sc.courseId || sc);
    }

    // Process each course
    const selectedCoursesWithCommunities = [];

    for (const courseId of courseIds) {
      // Check if community already exists for this course
      let community = await communitiesModel.findOne({
        classId: new ObjectId(classId),
        courseId: courseId,
        type: "course",
      });

      if (community) {
        // Reactivate if inactive
        if (!community.isActive) {
          community.isActive = true;
          await community.save();
        }
      } else {
        // Get course title
        const course = await coursesModel.findById(courseId).select("title").lean();
        const courseName = course?.title || "Untitled Course";

        // Create new course community
        community = await communitiesModel.create({
          name: courseName,
          type: "course",
          classId: new ObjectId(classId),
          courseId: courseId,
          isActive: true,
        });
      }

      selectedCoursesWithCommunities.push({
        courseId: courseId,
        communityId: community._id,
      });
    }

    updatedForumSettings.selectedCourses = selectedCoursesWithCommunities;

    // Deactivate communities for courses that are no longer selected
    const activeCourseIds = courseIds.map((id) => id.toString());
    await communitiesModel.updateMany(
      {
        classId: classId,
        type: "course",
        courseId: { $nin: activeCourseIds },
        isActive: true,
      },
      { isActive: false }
    );
  } else {
    // Disable course forums - deactivate all course communities for this class
    await communitiesModel.updateMany(
      {
        classId: new ObjectId(classId),
        type: "course",
        isActive: true,
      },
      { isActive: false }
    );
    updatedForumSettings.selectedCourses = [];
  }

  return updatedForumSettings;
}

