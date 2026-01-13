import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import { io } from 'socket.io-client';

describe("Message Reply Socket Tests", () => {
  let server: any;
  let studentSocket: any;
  let teacherSocket: any;
  let studentToken: string;
  let teacherToken: string;
  let testStudentId: any;
  let testTeacherId: any;
  let testConversationId: any;
  let testMessageId: any;
  let testSchoolId: any;

  before(async function() {
    this.timeout(20000);

    const port = app.get("port") || 3034;
    server = app.listen(port);

    // Store server reference and initialize chat socket
    app.set("server", server);
    const initializeChatSocket = require('../../../src/socket/chatSocket');
    initializeChatSocket(app);

    await new Promise(resolve => setTimeout(resolve, 2000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const conversationsModel = app.get("mongooseClient").models.conversations;
    const messagesModel = app.get("mongooseClient").models.messages;

    const school = await schoolsModel.create({
      schoolName: "Test Reply School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    // Create student
    const student = await usersModel.create({
      firstName: "Student1",
      lastName: "Test",
      email: `student_reply_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testStudentId = student._id;

    // Create teacher
    const teacher = await usersModel.create({
      firstName: "Teacher1",
      lastName: "Test",
      email: `teacher_reply_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}2`,
      role: "Teacher",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });
    testTeacherId = teacher._id;

    // Authenticate student
    const studentAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student.mobileNo,
      otp: testOTP
    }, {});
    studentToken = studentAuth.accessToken;

    // Authenticate teacher
    const teacherAuth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: teacher.mobileNo,
      otp: testOTP
    }, {});
    teacherToken = teacherAuth.accessToken;

    // Create conversation between student and teacher
    const conversation = await conversationsModel.create({
      participants: [testStudentId, testTeacherId],
      lastMessage: {},
      lastMessageAt: new Date(),
      unreadCount: {},
      isActive: true
    });
    testConversationId = conversation._id;

    // Create original message from teacher
    const message = await messagesModel.create({
      conversationId: testConversationId,
      senderId: testTeacherId,
      recipientId: testStudentId,
      content: "Hello, how are you doing?",
      status: {
        delivered: false,
        read: false
      },
      isEdited: false,
      isDeleted: false,
      reactions: [],
      reactionCounts: {
        thumbs_up: 0,
        heart: 0,
        laugh: 0,
        surprised: 0,
        sad: 0,
        total: 0
      }
    });
    testMessageId = message._id;

    // Connect student socket
    const socketUrl = `http://localhost:${port}`;
    studentSocket = io(socketUrl, {
      path: '/chat-socket/',
      query: { token: studentToken },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000,
      forceNew: true
    });

    // Connect teacher socket
    teacherSocket = io(socketUrl, {
      path: '/chat-socket/',
      query: { token: teacherToken },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000,
      forceNew: true
    });

    // Wait for both sockets to connect
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('Student socket connection timeout'));
        }, 10000);

        studentSocket.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('Test student socket connected successfully');
          resolve();
        });

        studentSocket.on('connect_error', (error: any) => {
          clearTimeout(connectTimeout);
          console.error('Student socket connection error:', error.message);
          reject(error);
        });
      }),
      new Promise<void>((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('Teacher socket connection timeout'));
        }, 10000);

        teacherSocket.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('Test teacher socket connected successfully');
          resolve();
        });

        teacherSocket.on('connect_error', (error: any) => {
          clearTimeout(connectTimeout);
          console.error('Teacher socket connection error:', error.message);
          reject(error);
        });
      })
    ]);

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  after(async function() {
    this.timeout(10000);

    if (studentSocket) studentSocket.disconnect();
    if (teacherSocket) teacherSocket.disconnect();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  it("Test 1: Send reply and receive via socket", function(this: Mocha.Context, done) {
    this.timeout(10000);

    teacherSocket.once('message:reply:receive', (data: any) => {
      try {
        console.log('Received message:reply:receive:', data);
        assert.strictEqual(data.reply.messageId, testMessageId.toString(), "Should reference correct original message");
        assert.ok(data.reply.content, "Should include reply content");
        assert.strictEqual(data.reply.messageType, 'text', "Should have correct message type");
        assert.strictEqual(data.reply.senderId, testTeacherId.toString(), "Should have correct original sender");
        assert.strictEqual(data.conversationId, testConversationId.toString(), "Should be in correct conversation");
        assert.strictEqual(data.from, testStudentId.toString(), "Should be from student");
        assert.strictEqual(data.to, testTeacherId.toString(), "Should be to teacher");
        done();
      } catch (error) {
        done(error);
      }
    });

    console.log('Emitting message:reply from student to teacher');
    studentSocket.emit('message:reply', {
      recipientId: testTeacherId,
      content: 'I am doing great, thank you!',
      conversationId: testConversationId,
      replyToMessageId: testMessageId
    });
  });

  it("Test 2: Reply object structure saved in database", function(this: Mocha.Context, done) {
    this.timeout(10000);

    teacherSocket.once('message:reply:receive', async (data: any) => {
      try {
        // Wait a bit for database to be updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Query the message from database
        const Messages = app.get("mongooseClient").models.messages;
        const savedMessage = await Messages.findById(data.id);

        assert.ok(savedMessage, "Message should be saved in database");
        assert.ok(savedMessage.reply, "Message should have reply object");
        assert.strictEqual(savedMessage.reply.messageId.toString(), testMessageId.toString(), "Reply should reference correct message");
        assert.strictEqual(savedMessage.reply.content, "Hello, how are you doing?", "Reply should have correct content");
        assert.strictEqual(savedMessage.reply.messageType, 'text', "Reply should have correct type");
        assert.strictEqual(savedMessage.reply.senderId.toString(), testTeacherId.toString(), "Reply should have correct sender");

        done();
      } catch (error) {
        done(error);
      }
    });

    studentSocket.emit('message:reply', {
      recipientId: testTeacherId,
      content: 'Database test reply',
      conversationId: testConversationId,
      replyToMessageId: testMessageId
    });
  });

  it("Test 3: Content truncation for long original messages", function(this: Mocha.Context, done) {
    this.timeout(10000);

    // First create a very long original message
    const longMessageContent = "A".repeat(250); // Longer than 200 chars

    // Create long message
    const Messages = app.get("mongooseClient").models.messages;
    Messages.create({
      conversationId: testConversationId,
      senderId: testTeacherId,
      recipientId: testStudentId,
      content: longMessageContent,
      status: { delivered: false, read: false },
      reactions: [],
      reactionCounts: { thumbs_up: 0, heart: 0, laugh: 0, surprised: 0, sad: 0, total: 0 }
    }).then(async (longMessage: any) => {
      teacherSocket.once('message:reply:receive', (data: any) => {
        try {
          const expectedTruncated = longMessageContent.substring(0, 200) + "...";
          assert.strictEqual(data.reply.content, expectedTruncated, "Long content should be truncated to 200 chars + ...");
          done();
        } catch (error) {
          done(error);
        }
      });

      studentSocket.emit('message:reply', {
        recipientId: testTeacherId,
        content: 'Reply to long message',
        conversationId: testConversationId,
        replyToMessageId: longMessage._id
      });
    }).catch(done);
  });

  it("Test 4: Reply to non-existent message returns error", function(this: Mocha.Context, done) {
    this.timeout(10000);

    const fakeMessageId = "507f1f77bcf86cd799439011"; // Valid ObjectId format but doesn't exist

    studentSocket.once('message:error', (data: any) => {
      try {
        console.log('Received message:error:', data);
        assert.ok(data.error, "Should receive error");
        assert.strictEqual(data.error, "Original message not found", "Should have correct error message");
        done();
      } catch (error) {
        done(error);
      }
    });

    studentSocket.emit('message:reply', {
      recipientId: testTeacherId,
      content: 'Reply to non-existent message',
      conversationId: testConversationId,
      replyToMessageId: fakeMessageId
    });
  });

  it("Test 5: Reply to deleted message returns error", function(this: Mocha.Context, done) {
    this.timeout(10000);

    // First create and then delete a message
    const Messages = app.get("mongooseClient").models.messages;
    Messages.create({
      conversationId: testConversationId,
      senderId: testTeacherId,
      recipientId: testStudentId,
      content: "This will be deleted",
      status: { delivered: false, read: false },
      reactions: [],
      reactionCounts: { thumbs_up: 0, heart: 0, laugh: 0, surprised: 0, sad: 0, total: 0 }
    }).then(async (messageToDelete: any) => {
      // Mark as deleted
      await Messages.findByIdAndUpdate(messageToDelete._id, { isDeleted: true, deletedAt: new Date() });

      studentSocket.once('message:error', (data: any) => {
        try {
          assert.ok(data.error, "Should receive error");
          assert.strictEqual(data.error, "Cannot reply to deleted message", "Should have correct error message");
          done();
        } catch (error) {
          done(error);
        }
      });

      studentSocket.emit('message:reply', {
        recipientId: testTeacherId,
        content: 'Reply to deleted message',
        conversationId: testConversationId,
        replyToMessageId: messageToDelete._id
      });
    }).catch(done);
  });

  it("Test 6: Both users online - immediate delivery", function(this: Mocha.Context, done) {
    this.timeout(10000);

    let eventReceived = false;

    teacherSocket.once('message:reply:receive', (data: any) => {
      eventReceived = true;
      try {
        assert.strictEqual(data.status, 'sent', "Should have sent status");
        // Message should be marked as delivered in DB after socket delivery
        setTimeout(async () => {
          try {
            const Messages = app.get("mongooseClient").models.messages;
            const savedMessage = await Messages.findById(data.id);
            assert.strictEqual(savedMessage.status.delivered, true, "Message should be marked as delivered");
            done();
          } catch (error) {
            done(error);
          }
        }, 500);
      } catch (error) {
        done(error);
      }
    });

    studentSocket.emit('message:reply', {
      recipientId: testTeacherId,
      content: 'Online delivery test',
      conversationId: testConversationId,
      replyToMessageId: testMessageId
    });

    // Timeout if no event received
    setTimeout(() => {
      if (!eventReceived) {
        done(new Error("Reply not delivered to online recipient"));
      }
    }, 8000);
  });

  it("Test 7: Missing required fields returns error", function(this: Mocha.Context, done) {
    this.timeout(5000);

    studentSocket.once('message:error', (data: any) => {
      try {
        assert.ok(data.error, "Should receive error");
        assert.strictEqual(data.error, "Missing required fields: recipientId, content, replyToMessageId, conversationId", "Should have correct error message");
        done();
      } catch (error) {
        done(error);
      }
    });

    // Missing recipientId
    studentSocket.emit('message:reply', {
      content: 'Missing recipient',
      conversationId: testConversationId,
      replyToMessageId: testMessageId
    });
  });

  it("Test 8: Delivery confirmation to sender", function(this: Mocha.Context, done) {
    this.timeout(10000);

    let deliveredEventReceived = false;

    studentSocket.once('message:delivered', (data: any) => {
      deliveredEventReceived = true;
      try {
        assert.ok(data.messageId, "Should have messageId");
        assert.ok(data.tempId, "Should have tempId");
        assert.ok(data.timestamp, "Should have timestamp");
        assert.strictEqual(data.recipientOnline, true, "Recipient should be online");
        assert.strictEqual(data.conversationId, testConversationId.toString(), "Should have correct conversationId");
        done();
      } catch (error) {
        done(error);
      }
    });

    studentSocket.emit('message:reply', {
      recipientId: testTeacherId,
      content: 'Delivery confirmation test',
      conversationId: testConversationId,
      replyToMessageId: testMessageId,
      tempId: 'test_temp_id_123'
    });

    // Timeout if no delivery confirmation
    setTimeout(() => {
      if (!deliveredEventReceived) {
        done(new Error("Delivery confirmation not received"));
      }
    }, 8000);
  });
});