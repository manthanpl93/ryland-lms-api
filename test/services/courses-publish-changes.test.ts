import assert from "assert";
import app from "../../src/app";
import { IPublishChangesResponse } from "../../src/types/courses.types";

describe("'courses' service - publish changes", () => {
  let courseId: string;
  let approvedCourseId: string;

  before(async () => {
    // Create a test course
    const courseData = {
      title: "Test Course",
      category: "Test Category",
      courseDescription: "Test Description",
      difficultyLevel: "Beginner",
      learnings: ["Test Learning 1", "Test Learning 2"],
      outline: [],
      owner: "507f1f77bcf86cd799439011", // Mock user ID
      status: "draft",
    };

    const course = await app.service("courses").create(courseData);
    courseId = course._id;

    // Create an approved course version for testing
    const approvedCourseData = {
      mainCourse: courseId,
      title: "Test Course Original",
      courseDescription: "Original Description",
      learnings: ["Original Learning"],
      outline: [],
      owner: "507f1f77bcf86cd799439011",
      courseHash: "original_hash",
    };

    const approvedCourse = await app.service("approved-courses").create(approvedCourseData);
    approvedCourseId = approvedCourse._id;

    // Update the main course to have changes
    await app.service("courses").patch(courseId, {
      title: "Test Course Updated",
      courseDescription: "Updated Description",
      learnings: ["Updated Learning 1", "Updated Learning 2"],
      courseHash: "updated_hash", // Different hash to indicate changes
    });
  });

  after(async () => {
    // Clean up test data
    if (courseId) {
      await app.service("courses").remove(courseId);
    }
    if (approvedCourseId) {
      await app.service("approved-courses").remove(approvedCourseId);
    }
  });

  it("should register the service", () => {
    const service = app.service("courses");
    assert.ok(service, "Registered the service");
  });

  it("should return publish changes when course has changes", async () => {
    const result: IPublishChangesResponse = await app.service("courses").patch(courseId, {
      controller: "get-publish-changes"
    });

    assert.ok(result, "Should return a result");
    assert.strictEqual(result.coursePublished, true, "Course should be marked as published");
    assert.strictEqual(result.hasChanges, true, "Should detect changes");
    
    if (result.hasChanges) {
      assert.ok(result.changesByCategory, "Should have changes by category");
      assert.ok(result.changesByCategory.details, "Should have details changes");
      assert.ok(result.changesByCategory.lessons, "Should have lessons changes");
      assert.ok(result.changesByCategory.certificate, "Should have certificate changes");
    }
  });

  it("should handle course not published case", async () => {
    // Create a new course without approved version
    const newCourseData = {
      title: "Unpublished Course",
      category: "Test Category",
      courseDescription: "Test Description",
      difficultyLevel: "Beginner",
      learnings: ["Test Learning"],
      outline: [],
      owner: "507f1f77bcf86cd799439011",
      status: "draft",
    };

    const newCourse = await app.service("courses").create(newCourseData);
    const newCourseId = newCourse._id;

    try {
      const result: IPublishChangesResponse = await app.service("courses").patch(newCourseId, {
        controller: "get-publish-changes"
      });

      assert.ok(result, "Should return a result");
      assert.strictEqual(result.coursePublished, false, "Course should not be marked as published");
      assert.strictEqual(result.hasChanges, false, "Should not have changes");
      assert.ok(!("changesByCategory" in result), "Should not have changesByCategory");
    } finally {
      // Clean up
      await app.service("courses").remove(newCourseId);
    }
  });

  it("should handle course with no changes case", async () => {
    // Update course to have same hash as approved version
    await app.service("courses").patch(courseId, {
      courseHash: "original_hash", // Same as approved course
    });

    const result: IPublishChangesResponse = await app.service("courses").patch(courseId, {
      controller: "get-publish-changes"
    });

    assert.ok(result, "Should return a result");
    assert.strictEqual(result.coursePublished, true, "Course should be marked as published");
    assert.strictEqual(result.hasChanges, false, "Should not have changes");
    assert.ok(!("changesByCategory" in result), "Should not have changesByCategory");

    // Reset for other tests
    await app.service("courses").patch(courseId, {
      courseHash: "updated_hash",
    });
  });

  it("should handle invalid course ID", async () => {
    const invalidCourseId = "507f1f77bcf86cd799439999";
    
    try {
      await app.service("courses").patch(invalidCourseId, {
        controller: "get-publish-changes"
      });
      assert.fail("Should have thrown an error");
    } catch (error: any) {
      assert.ok(error.message.includes("Course not found"), "Should throw course not found error");
    }
  });
}); 