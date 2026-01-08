import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";

describe("Forum Post Upvote Integration Tests", () => {
  let server: any;
  let student1Token: string;
  let student2Token: string;
  let student3Token: string;
  let testStudent1Id: any;
  let testStudent2Id: any;
  let testStudent3Id: any;
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
      schoolName: "Test Upvote School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const students = [];
    for (let i = 1; i <= 3; i++) {
      const student = await usersModel.create({
        firstName: `Student${i}`,
        lastName: "Test",
        email: `student${i}_upvote_${uniqueId}@test.com`,
        mobileNo: `+1${uniqueId}${i}`,
        role: "Student",
        status: "Active",
        schoolId: testSchoolId,
        otp: testOTP,
        otpGeneratedAt: new Date()
      });
      students.push(student);
    }

    testStudent1Id = students[0]._id;
    testStudent2Id = students[1]._id;
    testStudent3Id = students[2]._id;

    const auth1 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: students[0].mobileNo,
      otp: testOTP
    }, {});
    student1Token = auth1.accessToken;

    const auth2 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: students[1].mobileNo,
      otp: testOTP
    }, {});
    student2Token = auth2.accessToken;

    const auth3 = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: students[2].mobileNo,
      otp: testOTP
    }, {});
    student3Token = auth3.accessToken;

    const testClass = await classesModel.create({
      name: "Test Upvote Class",
      status: "Active",
      schoolId: testSchoolId
    });
    testClassId = testClass._id;

    for (const student of students) {
      await classEnrollmentsModel.create({
        classId: testClassId,
        studentId: student._id,
        status: "Active"
      });
    }

    const community = await communitiesModel.create({
      name: "Test Community",
      type: "class",
      classId: testClassId,
      isActive: true
    });
    testCommunityId = community._id;

    const post = await forumPostsModel.create({
      title: "Test Post",
      content: "Test Content",
      authorId: testStudent1Id,
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

  it("Test 1: Upvote post creates vote record and updates counters", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-post-upvote");
    const forumPostVotesModel = app.get("mongooseClient").models.forumPostVotes;
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    await upvoteService.create({
      postId: testPostId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    const vote = await forumPostVotesModel.findOne({ postId: testPostId, userId: testStudent1Id }).lean();
    assert.ok(vote, "Vote record should exist");
    assert.strictEqual(vote.voteType, "upvote", "Vote type should be upvote");

    const post = await forumPostsModel.findById(testPostId).lean();
    assert.strictEqual(post.upvotes, 1, "Upvotes should be 1");
    assert.strictEqual(post.downvotes, 0, "Downvotes should be 0");
    assert.strictEqual(post.voteScore, 1, "VoteScore should be 1");
  });

  it("Test 2: Toggle upvote removes vote", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-post-upvote");
    const forumPostVotesModel = app.get("mongooseClient").models.forumPostVotes;
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    await upvoteService.create({
      postId: testPostId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      postId: testPostId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    const vote = await forumPostVotesModel.findOne({ postId: testPostId, userId: testStudent2Id }).lean();
    assert.ok(!vote, "Vote record should be deleted");

    const post = await forumPostsModel.findById(testPostId).lean();
    assert.ok(post.upvotes >= 0, "Upvotes should be valid");
  });

  it("Test 3: Change vote from upvote to downvote", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-post-upvote");
    const forumPostVotesModel = app.get("mongooseClient").models.forumPostVotes;
    const forumPostsModel = app.get("mongooseClient").models.forumPosts;

    await upvoteService.create({
      postId: testPostId,
      voteType: "upvote"
    }, {
      user: { _id: testStudent3Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      postId: testPostId,
      voteType: "downvote"
    }, {
      user: { _id: testStudent3Id, role: "Student" },
      authenticated: true
    });

    const vote = await forumPostVotesModel.findOne({ postId: testPostId, userId: testStudent3Id }).lean();
    assert.strictEqual(vote.voteType, "downvote", "Vote type should be downvote");

    const post = await forumPostsModel.findById(testPostId).lean();
    assert.ok(post.downvotes >= 1, "Should have at least 1 downvote");
  });

  it("Test 4: Multiple users voting updates correctly", async function(this: Mocha.Context) {
    this.timeout(5000);

    const forumPostsModel = app.get("mongooseClient").models.forumPosts;
    const forumPostVotesModel = app.get("mongooseClient").models.forumPostVotes;

    const post2 = await forumPostsModel.create({
      title: "Multi Vote Post",
      content: "Content for multi-vote testing with minimum length requirements.",
      authorId: testStudent1Id,
      communityId: testCommunityId,
      classId: testClassId
    });

    const upvoteService = app.service("forum-post-upvote");

    await upvoteService.create({
      postId: post2._id,
      voteType: "upvote"
    }, {
      user: { _id: testStudent1Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      postId: post2._id,
      voteType: "upvote"
    }, {
      user: { _id: testStudent2Id, role: "Student" },
      authenticated: true
    });

    await upvoteService.create({
      postId: post2._id,
      voteType: "downvote"
    }, {
      user: { _id: testStudent3Id, role: "Student" },
      authenticated: true
    });

    const post = await forumPostsModel.findById(post2._id).lean();
    assert.strictEqual(post.upvotes, 2, "Should have 2 upvotes");
    assert.strictEqual(post.downvotes, 1, "Should have 1 downvote");
    assert.strictEqual(post.voteScore, 1, "VoteScore should be 1 (2-1)");

    const voteCount = await forumPostVotesModel.countDocuments({ postId: post2._id });
    assert.strictEqual(voteCount, 3, "Should have 3 vote records");
  });

  it("Test 5: Vote on non-existent post fails", async function(this: Mocha.Context) {
    this.timeout(5000);

    const upvoteService = app.service("forum-post-upvote");
    const { ObjectId } = require("mongodb");

    try {
      await upvoteService.create({
        postId: new ObjectId(),
        voteType: "upvote"
      }, {
        user: { _id: testStudent1Id, role: "Student" },
        authenticated: true
      });
      assert.fail("Should have thrown error");
    } catch (error: any) {
      assert.strictEqual(error.code, 400, "Should return 400 Bad Request");
    }
  });
});

