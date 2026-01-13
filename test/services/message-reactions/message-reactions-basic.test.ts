import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import { io } from 'socket.io-client';

describe("Message Reactions Basic Integration Tests", () => {
  let server: any;
  let student1Token: string;
  let student2Token: string;
  let testStudent1Id: any;
  let testStudent2Id: any;
  let testConversationId: any;
  let testMessageId: any;
  let testSchoolId: any;
  let student1Socket: any;
  let student2Socket: any;

  before(async function() {
    this.timeout(20000);

    // Use a different port to avoid conflicts
    const port = app.get("port") || 3036;
    server = app.listen(port);

    // Initialize chat socket
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
      schoolName: "Test Reactions Basic School",
      schoolType: "public",
      address: "123 Test St",
      city: "Test City",
      status: "active"
    });
    testSchoolId = school._id;

    const uniqueId = Date.now();
    const testOTP = 111111;

    const students = [];
    for (let i = 1; i <= 2; i++) {
      const student = await usersModel.create({
        firstName: `Student${i}`,
        lastName: "Test",
        email: `student${i}_basic_${uniqueId}@test.com`,
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

    // Create conversation and message
    const conversation = await conversationsModel.create({
      participants: [testStudent1Id, testStudent2Id],
      lastMessage: {},
      lastMessageAt: new Date(),
      unreadCount: {},
      isActive: true
    });
    testConversationId = conversation._id;

    const message = await messagesModel.create({
      conversationId: testConversationId,
      senderId: testStudent1Id,
      recipientId: testStudent2Id,
      content: "Test message for basic reactions",
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

    // Create socket connections
    const socketUrl = `http://localhost:${port}`;

    student1Socket = io(socketUrl, {
      path: '/chat-socket/',
      query: { token: student1Token },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000
    });

    student2Socket = io(socketUrl, {
      path: '/chat-socket/',
      query: { token: student2Token },
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 15000
    });

    // Wait for all sockets to connect
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Student1 socket timeout')), 10000);
        student1Socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        student1Socket.on('connect_error', (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      }),
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Student2 socket timeout')), 10000);
        student2Socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        student2Socket.on('connect_error', (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      })
    ]);

    console.log('All test sockets connected successfully');
  });

  // Clean up reactions before each test to prevent state pollution
  beforeEach(async function(this: Mocha.Context) {
    this.timeout(5000);
    const messagesModel = app.get("mongooseClient").models.messages;

    // Clear all reactions from the test message
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

    // Remove all existing event listeners to prevent pollution
    student1Socket.removeAllListeners('reaction:updated');
    student1Socket.removeAllListeners('reaction:error');
    student2Socket.removeAllListeners('reaction:updated');
    student2Socket.removeAllListeners('reaction:error');

    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  after(async function() {
    this.timeout(10000);

    // Disconnect sockets
    if (student1Socket) student1Socket.disconnect();
    if (student2Socket) student2Socket.disconnect();

    // Close server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    await clearTestDatabase();
  });

  it("Test 1: Add reaction creates record and updates counters", async function(this: Mocha.Context) {
    this.timeout(5000);

    return new Promise<void>((resolve, reject) => {
      // Set up listener for reaction updates
      let updateReceived = false;

      const checkComplete = () => {
        if (updateReceived) {
          resolve();
        }
      };

      student1Socket.on('reaction:updated', (data: any) => {
        try {
          assert.strictEqual(data.messageId, testMessageId.toString(), "Should update correct message");
          assert.strictEqual(data.reactionCounts.thumbs_up, 1, "Thumbs up count should be 1");
          assert.strictEqual(data.reactionCounts.total, 1, "Total count should be 1");
          assert.strictEqual(data.userId, testStudent1Id.toString(), "Should be from correct user");
          assert.strictEqual(data.action, 'added', "Action should be 'added'");
          assert.strictEqual(data.reactions.length, 1, "Should have 1 reaction in array");
          assert.strictEqual(data.reactions[0].reactionType, "thumbs_up", "Reaction type should be thumbs_up");

          updateReceived = true;
          checkComplete();
        } catch (error) {
          reject(error);
        }
      });

      // Send reaction
      student1Socket.emit('reaction:add', {
        messageId: testMessageId,
        reactionType: 'thumbs_up'
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!updateReceived) {
          reject(new Error('Reaction update not received within timeout'));
        }
      }, 3000);
    });
  });

  it("Test 2: Toggle reaction removes it", async function(this: Mocha.Context) {
    this.timeout(5000);

    return new Promise<void>((resolve, reject) => {
      let addReceived = false;
      let toggleReceived = false;

      const checkComplete = () => {
        if (addReceived && toggleReceived) {
          resolve();
        }
      };

      student2Socket.on('reaction:updated', (data: any) => {
        try {
          if (data.action === 'added') {
            assert.strictEqual(data.reactionCounts.heart, 1, "Heart count should be 1 after add");
            assert.strictEqual(data.userId, testStudent2Id.toString(), "Should be from correct user");
            addReceived = true;
            checkComplete();

            // Now toggle it off
            setTimeout(() => {
              student2Socket.emit('reaction:add', {
                messageId: testMessageId,
                reactionType: 'heart'
              });
            }, 100);
          } else if (data.action === 'toggled') {
            assert.strictEqual(data.reactionCounts.heart, 0, "Heart count should be 0 after toggle");
            assert.strictEqual(data.userId, testStudent2Id.toString(), "Should be from correct user");
            assert.strictEqual(data.reactions.length, 0, "Reactions array should be empty");
            toggleReceived = true;
            checkComplete();
          }
        } catch (error) {
          reject(error);
        }
      });

      // Start by adding reaction
      student2Socket.emit('reaction:add', {
        messageId: testMessageId,
        reactionType: 'heart'
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!addReceived || !toggleReceived) {
          reject(new Error('Reaction toggle test timed out'));
        }
      }, 5000);
    });
  });

  it("Test 3: Change reaction updates type and counters", async function(this: Mocha.Context) {
    this.timeout(5000);

    return new Promise<void>((resolve, reject) => {
      let addReceived = false;
      let changeReceived = false;

      const checkComplete = () => {
        if (addReceived && changeReceived) {
          resolve();
        }
      };

      student2Socket.on('reaction:updated', (data: any) => {
        try {
          if (data.action === 'added') {
            assert.strictEqual(data.reactionCounts.laugh, 1, "Laugh count should be 1 after add");
            assert.strictEqual(data.reactionCounts.surprised, 0, "Surprised count should be 0");
            assert.strictEqual(data.userId, testStudent2Id.toString(), "Should be from correct user");
            addReceived = true;
            checkComplete();

            // Now change to surprised
            setTimeout(() => {
              student2Socket.emit('reaction:add', {
                messageId: testMessageId,
                reactionType: 'surprised'
              });
            }, 100);
          } else if (data.action === 'changed') {
            assert.strictEqual(data.reactionCounts.laugh, 0, "Laugh count should be 0 after change");
            assert.strictEqual(data.reactionCounts.surprised, 1, "Surprised count should be 1 after change");
            assert.strictEqual(data.userId, testStudent2Id.toString(), "Should be from correct user");
            assert.strictEqual(data.reactions.length, 1, "Should have 1 reaction");
            assert.strictEqual(data.reactions[0].reactionType, "surprised", "Reaction should be changed to surprised");
            changeReceived = true;
            checkComplete();
          }
        } catch (error) {
          reject(error);
        }
      });

      // Start by adding laugh reaction
      student2Socket.emit('reaction:add', {
        messageId: testMessageId,
        reactionType: 'laugh'
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!addReceived || !changeReceived) {
          reject(new Error('Reaction change test timed out'));
        }
      }, 5000);
    });
  });

  it("Test 4: Remove reaction explicitly", async function(this: Mocha.Context) {
    this.timeout(5000);

    return new Promise<void>((resolve, reject) => {
      let addReceived = false;
      let removeReceived = false;

      const checkComplete = () => {
        if (addReceived && removeReceived) {
          resolve();
        }
      };

      student1Socket.on('reaction:updated', (data: any) => {
        try {
          if (data.action === 'added') {
            assert.strictEqual(data.reactionCounts.sad, 1, "Sad count should be 1 after add");
            addReceived = true;
            checkComplete();

            // Now remove it explicitly
            setTimeout(() => {
              student1Socket.emit('reaction:remove', {
                messageId: testMessageId
              });
            }, 100);
          } else if (data.action === 'removed') {
            assert.strictEqual(data.reactionCounts.sad, 0, "Sad count should be 0 after remove");
            assert.strictEqual(data.reactions.length, 0, "Reactions array should be empty");
            removeReceived = true;
            checkComplete();
          }
        } catch (error) {
          reject(error);
        }
      });

      // Start by adding sad reaction
      student1Socket.emit('reaction:add', {
        messageId: testMessageId,
        reactionType: 'sad'
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!addReceived || !removeReceived) {
          reject(new Error('Reaction remove test timed out'));
        }
      }, 5000);
    });
  });
});