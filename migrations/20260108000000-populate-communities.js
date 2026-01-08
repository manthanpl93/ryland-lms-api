/**
 * Migration: Populate communities from existing forum settings
 * 
 * This migration creates community documents for existing classes that have
 * forum settings enabled and updates the classes with community IDs.
 */

module.exports = {
  async up(db, client) {
    console.log("🚀 Starting community population migration...");

    const classesCollection = db.collection("classes");
    const communitiesCollection = db.collection("communities");
    const coursesCollection = db.collection("courses");

    // Find all classes with forum settings
    const classes = await classesCollection.find({
      isDeleted: { $ne: true },
      $or: [
        { "forumSettings.enableClassForum": true },
        { "forumSettings.enableCourseForum": true },
      ],
    }).toArray();

    console.log(`📊 Found ${classes.length} classes with forum settings enabled`);

    let classCommunitiesCreated = 0;
    let courseCommunitiesCreated = 0;
    let classesUpdated = 0;

    for (const classDoc of classes) {
      const forumSettings = classDoc.forumSettings || {};
      const updatedForumSettings = { ...forumSettings };
      let settingsChanged = false;

      // 1. Handle Class Community
      if (forumSettings.enableClassForum === true) {
        // Check if community already exists
        let classCommunity = await communitiesCollection.findOne({
          classId: classDoc._id,
          type: "class",
        });

        if (!classCommunity) {
          // Create class community
          const result = await communitiesCollection.insertOne({
            name: "Class Community",
            type: "class",
            classId: classDoc._id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          classCommunity = { _id: result.insertedId };
          classCommunitiesCreated++;
          console.log(`✅ Created class community for class: ${classDoc.name}`);
        }

        updatedForumSettings.classCommunityId = classCommunity._id;
        settingsChanged = true;
      }

      // 2. Handle Course Communities
      if (forumSettings.enableCourseForum === true) {
        let courseIds = [];

        if (forumSettings.enableAllCourses === true) {
          // Get all courses for this class
          const courses = await coursesCollection
            .find({
              classId: classDoc._id,
              $or: [{ deleted: false }, { deleted: { $exists: false } }],
            })
            .project({ _id: 1, title: 1 })
            .toArray();

          courseIds = courses.map((c) => c._id);
        } else if (forumSettings.selectedCourses && forumSettings.selectedCourses.length > 0) {
          // Handle both old format (array of IDs) and new format (array of objects)
          courseIds = forumSettings.selectedCourses.map((sc) =>
            sc.courseId ? sc.courseId : sc
          );
        }

        if (courseIds.length > 0) {
          const selectedCoursesWithCommunities = [];

          for (const courseId of courseIds) {
            // Check if community already exists
            let courseCommunity = await communitiesCollection.findOne({
              classId: classDoc._id,
              courseId: courseId,
              type: "course",
            });

            if (!courseCommunity) {
              // Get course title
              const course = await coursesCollection.findOne(
                { _id: courseId },
                { projection: { title: 1 } }
              );
              const courseName = course?.title || "Untitled Course";

              // Create course community
              const result = await communitiesCollection.insertOne({
                name: courseName,
                type: "course",
                classId: classDoc._id,
                courseId: courseId,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              courseCommunity = { _id: result.insertedId };
              courseCommunitiesCreated++;
            }

            selectedCoursesWithCommunities.push({
              courseId: courseId,
              communityId: courseCommunity._id,
            });
          }

          updatedForumSettings.selectedCourses = selectedCoursesWithCommunities;
          settingsChanged = true;
        }
      }

      // Update class with new forum settings if changed
      if (settingsChanged) {
        await classesCollection.updateOne(
          { _id: classDoc._id },
          { $set: { forumSettings: updatedForumSettings } }
        );
        classesUpdated++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Class communities created: ${classCommunitiesCreated}`);
    console.log(`   - Course communities created: ${courseCommunitiesCreated}`);
    console.log(`   - Classes updated: ${classesUpdated}`);
    console.log(`✅ Community population migration completed!`);
  },

  async down(db, client) {
    console.log("⏪ Rolling back community population migration...");

    const classesCollection = db.collection("classes");
    const communitiesCollection = db.collection("communities");

    // Remove all community references from classes
    await classesCollection.updateMany(
      {},
      {
        $unset: { "forumSettings.classCommunityId": "" },
        $set: {
          "forumSettings.selectedCourses": [],
        },
      }
    );

    // Delete all communities
    const deleteResult = await communitiesCollection.deleteMany({});
    
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} communities`);
    console.log("✅ Rollback completed!");
  },
};

