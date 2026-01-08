import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Forum Post Comments Integration Tests", () => {
  let server: any;
  let studentToken: string;
  let student2Token: string;
  let adminToken: string;
  let testStudentId: any;
  let testStudent2Id: any;
  let testAdminId: any;
  let testClassId: any;
  let testCommunityId: any;
  let testPostId: any;
  let testSchoolId: any;

  before(async function() {
    this.timeout(10000);

    const port = app.get("port") || 3031;
    server = app.listen(port);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const classesModel = app.get("mongooseClient").models.classes;
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    const communitiesModel = app.get("mongooseClient").models.communities;
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    const school = await schoolsModel.create({
      schoolName: "Test Comments School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const admin = await usersModel.create({
      firstName: "Admin",
      lastName: "Test",
      email: `admin_comments_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Admin",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testAdminId = admin._id;

    const student1 = await usersModel.create({
      firstName: "Student1",
      lastName: "Test",
      email: `student1_comments_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}2`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudentId = student1._id;

    const student2 = await usersModel.create({
      firstName: "Student2",
      lastName: "Test",
      email: `student2_comments_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}3`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent2Id = student2._id;

    const adminAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: admin.mobileNo,
      otp: testOTP
    }, {});
    adminToken = adminAuth.accessToken;

    const studentAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student1.mobileNo,
      otp: testOTP
    }, {});
    studentToken = studentAuth.accessToken;

    const student2Auth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student2.mobileNo,
      otp: testOTP
    }, {});
    student2Token = student2Auth.accessToken;

    const testClass = await classesModel.create({
      name: "Test Comments Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudentId,
      status: "Active"
    });

    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudent2Id,
      status: "Active"
    });

    const community = await communitiesModel.create({
      name: "Test Community",
      type: "class",
      classId: testClassId,
      isActive: true
    });
    testCommunityId = community._id;

    const post = await forumPostsModel.create({
      title: "Test Post for Comments",
      content: "This is test content for comments testing.",
      authorId: testStudentId,
      communityId: testCommunityId,
      classId: testClassId
    });
    testPostId = post._id;
  });

  after(async function() {
    this.timeout(10000);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  it("Test 1: Create top-level comment increments post commentCount", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    await commentsService.create({
      postId: testPostId,
      content: "This is a top-level comment",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const post = await forumPostsModel.findById(testPostId).lean();
    assert.ok(post.commentCount >= 1, "Post commentCount should be incremented");
  });

  it("Test 2: Create nested reply increments parent replyCount", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    const topComment = await commentsService.create({
      postId: testPostId,
      content: "Top level comment for nesting",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    await commentsService.create({
      postId: testPostId,
      content: "This is a reply to the comment",
      parentCommentId: topComment._id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const parent = await forumPostCommentsModel.findById(topComment._id).lean();
    assert.ok(parent.replyCount >= 1, "Parent comment replyCount should be incremented");
  });

  it("Test 3: Find top-level comments only", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");

    const comment1 = await commentsService.create({
      postId: testPostId,
      content: "Top comment 1 for finding test",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const comment2 = await commentsService.create({
      postId: testPostId,
      content: "Top comment 2 for finding test",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    await commentsService.create({
      postId: testPostId,
      content: "Reply to comment1, should not appear",
      parentCommentId: comment1._id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const result = await commentsService.find({
      query: { postId: testPostId, parentCommentId: null },
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const comments = Array.isArray(result) ? result : result.data || [];
    const commentIds = comments.map((c: any) => c._id.toString());
    
    assert.ok(commentIds.includes(comment1._id.toString()), "Should include comment1");
    assert.ok(commentIds.includes(comment2._id.toString()), "Should include comment2");
  });

  it("Test 4: Find replies to specific comment", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");

    const parent = await commentsService.create({
      postId: testPostId,
      content: "Parent for reply testing",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const reply1 = await commentsService.create({
      postId: testPostId,
      content: "First reply to parent",
      parentCommentId: parent._id
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const reply2 = await commentsService.create({
      postId: testPostId,
      content: "Second reply to parent",
      parentCommentId: parent._id
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const result = await commentsService.find({
      query: { postId: testPostId, parentCommentId: parent._id },
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const replies = Array.isArray(result) ? result : result.data || [];
    assert.ok(replies.length >= 2, "Should return at least 2 replies");
    
    const replyIds = replies.map((r: any) => r._id.toString());
    assert.ok(replyIds.includes(reply1._id.toString()), "Should include reply1");
    assert.ok(replyIds.includes(reply2._id.toString()), "Should include reply2");
  });

  it("Test 5: Delete comment (soft delete)", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    const comment = await commentsService.create({
      postId: testPostId,
      content: "Comment to delete by author",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    await commentsService.remove(comment._id, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    const deleted = await forumPostCommentsModel.findById(comment._id).lean();
    assert.strictEqual(deleted.isDeleted, true, "Comment should be soft deleted");
    assert.strictEqual(deleted.deletedBy.toString(), testStudentId.toString(), "deletedBy should be student");
  });

  it("Test 6: Admin can delete any comment", async function(this: Mocha.Context) {
    this.timeout(5000);

    const commentsService = app.service("forum-post-comments");
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    const comment = await commentsService.create({
      postId: testPostId,
      content: "Student comment to be deleted by admin",
      parentCommentId: null
    }, {
      user: { _id: testStudentId, role: "Student" },
      authenticated: true
    });

    await commentsService.remove(comment._id, {
      user: { _id: testAdminId, role: "Admin" },
      authenticated: true
    });

    const deleted = await forumPostCommentsModel.findById(comment._id).lean();
    assert.strictEqual(deleted.isDeleted, true, "Comment should be deleted");
    assert.strictEqual(deleted.deletedBy.toString(), testAdminId.toString(), "deletedBy should be admin");
  });
});

