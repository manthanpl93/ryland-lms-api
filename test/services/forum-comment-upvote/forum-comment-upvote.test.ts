import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Forum Comment Upvote Integration Tests", () => {
  let server: any;
  let student1Token: string;
  let student2Token: string;
  let testStudent1Id: any;
  let testStudent2Id: any;
  let testClassId: any;
  let testCommunityId: any;
  let testPostId: any;
  let testCommentId: any;
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
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    const school = await schoolsModel.create({
      schoolName: "Test Comment Upvote School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const student1 = await usersModel.create({
      firstName: "Student1",
      lastName: "Test",
      email: `student1_cvote_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent1Id = student1._id;

    const student2 = await usersModel.create({
      firstName: "Student2",
      lastName: "Test",
      email: `student2_cvote_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}2`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudent2Id = student2._id;

    const auth1 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student1.mobileNo,
      otp: testOTP
    }, {});
    student1Token = auth1.accessToken;

    const auth2 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student2.mobileNo,
      otp: testOTP
    }, {});
    student2Token = auth2.accessToken;

    const testClass = await classesModel.create({
      name: "Test Comment Upvote Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    await classEnrollmentsModel.create({
      classId: testClassId,
      studentId: testStudent1Id,
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
      title: "Test Post",
      content: "Test content for comment upvote testing purposes.",
      authorId: testStudent1Id,
      communityId: testCommunityId,
      classId: testClassId
    });
    testPostId = post._id;

    const comment = await forumPostCommentsModel.create({
      postId: testPostId,
      content: "Test comment for upvoting",
      authorId: testStudent1Id
    });
    testCommentId = comment._id;
  });

  after(async function() {
    this.timeout(10000);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  it("Test 1: Upvote comment updates counters", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-comment-upvote");
    const forumCommentVotesModel = app.get("mongooseClient").models.forumCommentVotes;
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    await upvoteService.create({
      commentId: testCommentId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    const vote = await forumCommentVotesModel.findOne({ commentId: testCommentId, userId: testStudent1Id }).lean();
    assert.ok(vote, "Vote record should exist");
    assert.strictEqual(vote.voteType, "upvote", "Vote type should be upvote");

    const comment = await forumPostCommentsModel.findById(testCommentId).lean();
    assert.strictEqual(comment.upvotes, 1, "Upvotes should be 1");
    assert.strictEqual(comment.downvotes, 0, "Downvotes should be 0");
    assert.strictEqual(comment.voteScore, 1, "VoteScore should be 1");
  });

  it("Test 2: Toggle vote works correctly", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-comment-upvote");
    const forumCommentVotesModel = app.get("mongooseClient").models.forumCommentVotes;
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;

    await upvoteService.create({
      commentId: testCommentId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      commentId: testCommentId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const vote = await forumCommentVotesModel.findOne({ commentId: testCommentId, userId: testStudent2Id }).lean();
    assert.ok(!vote, "Vote record should be removed on toggle");

    const comment = await forumPostCommentsModel.findById(testCommentId).lean();
    assert.ok(comment.upvotes >= 0, "Upvotes should be valid");
  });

  it("Test 3: Multiple users can vote", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-comment-upvote");
    const forumPostCommentsModel = app.get("mongooseClient").models.forumPostComments;
    const forumCommentVotesModel = app.get("mongooseClient").models.forumCommentVotes;

    const comment2 = await forumPostCommentsModel.create({
      postId: testPostId,
      content: "Another comment for multiple votes test",
      authorId: testStudent1Id
    });

    await upvoteService.create({
      commentId: comment2._id,
      voteType: "upvote"
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      commentId: comment2._id,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const comment = await forumPostCommentsModel.findById(comment2._id).lean();
    assert.strictEqual(comment.upvotes, 2, "Should have 2 upvotes");
    assert.strictEqual(comment.voteScore, 2, "VoteScore should be 2");

    const voteCount = await forumCommentVotesModel.countDocuments({ commentId: comment2._id });
    assert.strictEqual(voteCount, 2, "Should have 2 vote records");
  });
});

