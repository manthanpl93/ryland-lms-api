/**
 * Migration: Add order field to sections and lessons
 * 
 * This migration adds an explicit order field to all sections (modules) and 
 * lessons in courses and published-courses collections. The order is assigned
 * based on the current array position to maintain existing ordering.
 */

module.exports = {
  async up(db, client) {
    console.log("🚀 Starting order field migration...");

    const coursesCollection = db.collection("courses");
    const publishedCoursesCollection = db.collection("publishedcourses");

    let coursesUpdated = 0;
    let publishedCoursesUpdated = 0;
    let totalSections = 0;
    let totalLessons = 0;

    // Process courses collection
    const courses = await coursesCollection.find({}).toArray();
    console.log(`📊 Found ${courses.length} courses to process`);

    for (const course of courses) {
      if (!course.outline || course.outline.length === 0) {
        continue;
      }

      let courseModified = false;
      const updatedOutline = course.outline.map((section, sectionIndex) => {
        // Add order to section if not exists
        if (section.order === undefined) {
          section.order = sectionIndex;
          courseModified = true;
          totalSections++;
        }

        // Add order to lessons if section has lessons
        if (section.lessons && section.lessons.length > 0) {
          section.lessons = section.lessons.map((lesson, lessonIndex) => {
            if (lesson.order === undefined) {
              lesson.order = lessonIndex;
              courseModified = true;
              totalLessons++;
            }
            return lesson;
          });
        }

        return section;
      });

      if (courseModified) {
        await coursesCollection.updateOne(
          { _id: course._id },
          { $set: { outline: updatedOutline } }
        );
        coursesUpdated++;
      }
    }

    // Process published courses collection
    const publishedCourses = await publishedCoursesCollection.find({}).toArray();
    console.log(`📊 Found ${publishedCourses.length} published courses to process`);

    for (const course of publishedCourses) {
      if (!course.outline || course.outline.length === 0) {
        continue;
      }

      let courseModified = false;
      const updatedOutline = course.outline.map((section, sectionIndex) => {
        // Add order to section if not exists
        if (section.order === undefined) {
          section.order = sectionIndex;
          courseModified = true;
          totalSections++;
        }

        // Add order to lessons if section has lessons
        if (section.lessons && section.lessons.length > 0) {
          section.lessons = section.lessons.map((lesson, lessonIndex) => {
            if (lesson.order === undefined) {
              lesson.order = lessonIndex;
              courseModified = true;
              totalLessons++;
            }
            return lesson;
          });
        }

        return section;
      });

      if (courseModified) {
        await publishedCoursesCollection.updateOne(
          { _id: course._id },
          { $set: { outline: updatedOutline } }
        );
        publishedCoursesUpdated++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Courses updated: ${coursesUpdated}`);
    console.log(`   - Published courses updated: ${publishedCoursesUpdated}`);
    console.log(`   - Total sections with order assigned: ${totalSections}`);
    console.log(`   - Total lessons with order assigned: ${totalLessons}`);
    console.log(`✅ Order field migration completed!`);
  },

  async down(db, client) {
    console.log("⏪ Rolling back order field migration...");

    const coursesCollection = db.collection("courses");
    const publishedCoursesCollection = db.collection("publishedcourses");

    let coursesProcessed = 0;
    let publishedCoursesProcessed = 0;

    // Process courses collection
    const courses = await coursesCollection.find({}).toArray();

    for (const course of courses) {
      if (!course.outline || course.outline.length === 0) {
        continue;
      }

      const updatedOutline = course.outline.map((section) => {
        // Remove order from section
        delete section.order;

        // Remove order from lessons
        if (section.lessons && section.lessons.length > 0) {
          section.lessons = section.lessons.map((lesson) => {
            delete lesson.order;
            return lesson;
          });
        }

        return section;
      });

      await coursesCollection.updateOne(
        { _id: course._id },
        { $set: { outline: updatedOutline } }
      );
      coursesProcessed++;
    }

    // Process published courses collection
    const publishedCourses = await publishedCoursesCollection.find({}).toArray();

    for (const course of publishedCourses) {
      if (!course.outline || course.outline.length === 0) {
        continue;
      }

      const updatedOutline = course.outline.map((section) => {
        // Remove order from section
        delete section.order;

        // Remove order from lessons
        if (section.lessons && section.lessons.length > 0) {
          section.lessons = section.lessons.map((lesson) => {
            delete lesson.order;
            return lesson;
          });
        }

        return section;
      });

      await publishedCoursesCollection.updateOne(
        { _id: course._id },
        { $set: { outline: updatedOutline } }
      );
      publishedCoursesProcessed++;
    }

    console.log(`🗑️  Processed ${coursesProcessed} courses`);
    console.log(`🗑️  Processed ${publishedCoursesProcessed} published courses`);
    console.log("✅ Rollback completed!");
  },
};
