import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import { io } from 'socket.io-client';

describe("Message Reactions Socket Tests - Simplified", () => {
  let server: any;
  let studentToken: string;
  let testStudentId: any;
  let testConversationId: any;
  let testMessageId: any;
  let testSchoolId: any;
  let studentSocket: any;

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
      schoolName: "Test Reactions School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const student = await usersModel.create({
      firstName: "Student1",
      lastName: "Test",
      email: `student_reactions_${uniqueId}@test.com`,
      mobileNo: `+1${uniqueId}1`,
      role: "Student",
      status: "Active",
      schoolId: testSchoolId,
      otp: testOTP,
      otpGeneratedAt: new Date()
    });

    testStudentId = student._id;

    const auth = await app.service("authentication").create({
      strategy: "otp",
      mobileNo: student.mobileNo,
      otp: testOTP
    }, {});
    studentToken = auth.accessToken;

    // Create conversation and message
    const conversation = await conversationsModel.create({
      participants: [testStudentId, testStudentId], // Self conversation for simplicity
      lastMessage: {},
      lastMessageAt: new Date(),
      unreadCount: {},
      isActive: true
    });
    testConversationId = conversation._id;

    const message = await messagesModel.create({
      conversationId: testConversationId,
      senderId: testStudentId,
      recipientId: testStudentId,
      content: "Test message for reactions",
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

    // Create socket connection to chat socket (uses separate socket.io instance)
    const socketUrl = `http://localhost:${port}`;
    studentSocket = io(socketUrl, {
      path: '/chat-socket/',
      query: { token: studentToken },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000,
      forceNew: true
    });

    // Wait for socket to connect
    await new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000);

      studentSocket.on('connect', () => {
        clearTimeout(connectTimeout);
        console.log('Test socket connected successfully');
        resolve();
      });

      studentSocket.on('connect_error', (error: any) => {
        clearTimeout(connectTimeout);
        console.error('Socket connection error:', error.message);
        reject(error);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  after(async function() {
    this.timeout(10000);

    if (studentSocket) studentSocket.disconnect();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearTestDatabase();
  });

  it("Test 1: Add reaction via socket and receive update", function(this: Mocha.Context, done: Mocha.Done) {
    this.timeout(10000);

    studentSocket.once('reaction:updated', (data: any) => {
      try {
        console.log('Received reaction:updated:', data);
        assert.strictEqual(data.messageId, testMessageId.toString(), "Should update correct message");
        assert.strictEqual(data.reactionCounts.thumbs_up, 1, "Thumbs up count should be 1");
        assert.strictEqual(data.reactionCounts.total, 1, "Total count should be 1");
        assert.strictEqual(data.action, 'added', "Action should be 'added'");
        done();
      } catch (error) {
        done(error);
      }
    });

    console.log('Emitting reaction:add for message:', testMessageId);
    studentSocket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'thumbs_up'
    });
  });

  it("Test 2: Toggle reaction removes it", function(this: Mocha.Context, done: Mocha.Done) {
    this.timeout(10000);

    let eventCount = 0;
    let doneCalled = false;

    const handler = (data: any) => {
      eventCount++;
      console.log(`Event ${eventCount} - action: ${data.action}, thumbs_up: ${data.reactionCounts.thumbs_up}`);

      try {
        if (data.action === 'toggled' && !doneCalled) {
          doneCalled = true;
          studentSocket.off('reaction:updated', handler); // Remove listener
          assert.strictEqual(data.reactionCounts.thumbs_up, 0, "Thumbs up count should be 0 after toggle");
          assert.strictEqual(data.reactionCounts.total, 0, "Total should be 0");
          done();
        }
      } catch (error) {
        if (!doneCalled) {
          doneCalled = true;
          studentSocket.off('reaction:updated', handler);
          done(error);
        }
      }
    };

    studentSocket.on('reaction:updated', handler);

    // Toggle the existing thumbs_up from Test 1
    console.log('Emitting reaction:add to toggle thumbs_up');
    studentSocket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'thumbs_up'
    });
  });

  it("Test 3: Change reaction type", function(this: Mocha.Context, done: Mocha.Done) {
    this.timeout(10000);

    let addReceived = false;
    let doneCalled = false;

    const handler = (data: any) => {
      try {
        if (data.action === 'added' && data.reactionCounts.heart === 1 && !addReceived) {
          console.log('Heart added');
          addReceived = true;

          // Now change to laugh
          setTimeout(() => {
            studentSocket.emit('reaction:add', {
              messageId: testMessageId,
              reactionType: 'laugh'
            });
          }, 200);
        } else if (data.action === 'changed' && data.reactionCounts.laugh === 1 && !doneCalled) {
          console.log('Changed to laugh');
          doneCalled = true;
          studentSocket.off('reaction:updated', handler);
          assert.strictEqual(data.reactionCounts.heart, 0, "Heart should be 0");
          assert.strictEqual(data.reactionCounts.laugh, 1, "Laugh should be 1");
          done();
        }
      } catch (error) {
        if (!doneCalled) {
          doneCalled = true;
          studentSocket.off('reaction:updated', handler);
          done(error);
        }
      }
    };

    studentSocket.on('reaction:updated', handler);

    studentSocket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'heart'
    });
  });

  it("Test 4: Explicitly remove reaction", function(this: Mocha.Context, done: Mocha.Done) {
    this.timeout(10000);

    studentSocket.once('reaction:updated', (data: any) => {
      try {
        console.log('Reaction removed:', data);
        assert.strictEqual(data.action, 'removed', "Action should be 'removed'");
        assert.strictEqual(data.reactionCounts.laugh, 0, "Laugh should be 0");
        assert.strictEqual(data.reactionCounts.total, 0, "Total should be 0");
        done();
      } catch (error) {
        done(error);
      }
    });

    studentSocket.emit('reaction:remove', {
      messageId: testMessageId
    });
  });

  it("Test 5: Validate all reaction types", async function(this: Mocha.Context) {
    this.timeout(30000);

    const messagesModel = app.get("mongooseClient").models.messages;
    
    // Clear all reactions first
    await messagesModel.findByIdAndUpdate(testMessageId, {
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

    const reactionTypes = ["thumbs_up", "heart", "laugh", "surprised", "sad"];

    for (const type of reactionTypes) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout for ${type}`)), 5000);

        const handler = (data: any) => {
          try {
            if (data.reactionCounts[type] === 1) {
              clearTimeout(timeout);
              studentSocket.off('reaction:updated', handler);
              console.log(`Testing ${type}:`, data.reactionCounts[type]);
              assert.strictEqual(data.reactionCounts[type], 1, `${type} should be 1`);
              resolve();
            }
          } catch (error) {
            clearTimeout(timeout);
            studentSocket.off('reaction:updated', handler);
            reject(error);
          }
        };

        studentSocket.on('reaction:updated', handler);

        studentSocket.emit('reaction:add', {
          messageId: testMessageId,
          reactionType: type
        });
      });

      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });

  it("Test 6: Invalid reaction type shows error", function(this: Mocha.Context, done: Mocha.Done) {
    this.timeout(5000);

    studentSocket.once('reaction:error', (error: any) => {
      try {
        console.log('Received error:', error);
        assert.ok(error.error.includes("Invalid reaction type"), "Should reject invalid type");
        done();
      } catch (err) {
        done(err);
      }
    });

    studentSocket.emit('reaction:add', {
      messageId: testMessageId,
      reactionType: 'invalid_type'
    });
  });
});