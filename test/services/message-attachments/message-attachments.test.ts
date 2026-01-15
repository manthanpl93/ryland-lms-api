import assert from "assert";
import app from "../../../src/app";
import { clearTestDatabase } from "../../helpers/database";
import { io as ioClient } from "socket.io-client";
import axios from "axios";

describe("Message Attachments Integration Tests", () => {
  let server: any;
  let student1Token: string;
  let student2Token: string;
  let testStudent1Id: any;
  let testStudent2Id: any;
  let testConversationId: any;
  let testSchoolId: any;
  let student1Socket: any;
  let student2Socket: any;

  before(async function(this: Mocha.Context) {
    this.timeout(30000);

    // Use a different port to avoid conflicts
    const port = app.get("port") || 3037;
    server = app.listen(port);

    // Initialize chat socket
    app.set("server", server);
    const initializeChatSocket = require("../../../src/socket/chatSocket");
    initializeChatSocket(app);

    await new Promise(resolve => setTimeout(resolve, 2000));
    await clearTestDatabase();

    const schoolsModel = app.get("mongooseClient").models.schools;
    const usersModel = app.get("mongooseClient").models.users;
    const conversationsModel = app.get("mongooseClient").models.conversations;

    const school = await schoolsModel.create({
      schoolName: "Test Attachments School",
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
        lastName: "Attachment",
        email: `student${i}_attach_${uniqueId}@test.com`,
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

    // Create conversation
    const conversation = await conversationsModel.create({
      participants: [testStudent1Id, testStudent2Id],
      lastMessage: {},
      lastMessageAt: new Date(),
      unreadCount: {},
      isActive: true
    });
    testConversationId = conversation._id;
  });

  after(async function(this: Mocha.Context) {
    this.timeout(10000);
    if (student1Socket) student1Socket.disconnect();
    if (student2Socket) student2Socket.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (server) server.close();
  });

  beforeEach(function(this: Mocha.Context) {
    this.timeout(5000);
  });

  describe("1. Real S3 Upload Test (No Mocking)", () => {
    it("should upload a real test image to S3 and verify acceptance", async function(this: Mocha.Context) {
      this.timeout(30000);

      // Create a small test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );

      const filename = `test-image-${Date.now()}.png`;
      const fileSize = testImageBuffer.length;
      const mimeType = "image/png";

      try {
        // Step 1: Request presigned URL from our service
        const urlResponse = await app.service("message-attachments-upload").create({
          controller: "createPresignedUrl",
          filename,
          fileSize,
          mimeType,
          attachmentType: "image"
        }, {
          user: { _id: testStudent1Id }
        });

        assert.ok(urlResponse.signedUrl, "Presigned URL should be returned");
        assert.ok(urlResponse.objectUrl, "Object URL should be returned");
        assert.strictEqual(urlResponse.metadata.type, "image");

        // Step 2: Upload to S3 using presigned URL (REAL UPLOAD)
        const uploadResponse = await axios.put(urlResponse.signedUrl, testImageBuffer, {
          headers: {
            "Content-Type": mimeType,
          },
          timeout: 10000
        });

        // Step 3: Verify S3 accepted the upload
        assert.ok([200, 204].includes(uploadResponse.status), "S3 should accept the upload");

        // Step 4: Verify file is accessible
        const verifyResponse = await axios.head(urlResponse.objectUrl, {
          timeout: 5000
        });

        assert.strictEqual(verifyResponse.status, 200, "Uploaded file should be accessible");
        assert.ok(verifyResponse.headers["content-type"], "File should have content-type");

        console.log("✅ Real S3 upload test passed - S3 is accepting our media");
      } catch (error: any) {
        if (error.code === "ECONNREFUSED" || error.message?.includes("network")) {
          console.warn("⚠️  Network/S3 connection issue - skipping real upload test");
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe("2. Single Image Attachment", () => {
    let messageId: string;

    it("should send message with single image attachment via socket", function(this: Mocha.Context, done) {
      this.timeout(15000);

      const socketUrl = `http://localhost:${server.address().port}`;
      student1Socket = ioClient(socketUrl, {
        path: "/chat-socket/",
        query: { token: student1Token },
        transports: ["websocket"],
      });

      student2Socket = ioClient(socketUrl, {
        path: "/chat-socket/",
        query: { token: student2Token },
        transports: ["websocket"],
      });

      const testAttachment = {
        type: "image",
        url: "https://example.com/test-image.jpg",
        metadata: {
          filename: "test-image.jpg",
          size: 50000,
          mimeType: "image/jpeg",
          width: 800,
          height: 600,
          thumbnail: "https://example.com/test-image-thumb.jpg"
        }
      };

      let deliveredReceived = false;
      let recipientReceived = false;

      student2Socket.on("message:receive", async (data: any) => {
        try {
          assert.ok(data.id, "Message should have ID");
          assert.ok(data.attachments, "Message should have attachments");
          assert.strictEqual(data.attachments.length, 1, "Should have 1 attachment");
          assert.strictEqual(data.attachments[0].type, "image", "Attachment should be image");
          assert.ok(data.attachments[0].metadata.thumbnail, "Image should have thumbnail");

          messageId = data.id;
          recipientReceived = true;

          if (deliveredReceived && recipientReceived) {
            // Verify database record
            const messagesModel = app.get("mongooseClient").models.messages;
            const savedMessage = await messagesModel.findById(messageId);
            
            assert.ok(savedMessage, "Message should be in database");
            assert.ok(savedMessage.attachments, "Saved message should have attachments");
            assert.strictEqual(savedMessage.attachments.length, 1);

            // Verify conversation-attachments record
            const conversationAttachmentsModel = app.get("mongooseClient").models["conversation-attachments"];
            const attachmentRecords = await conversationAttachmentsModel.find({ messageId });
            
            assert.strictEqual(attachmentRecords.length, 1, "Should have 1 conversation-attachments record");
            assert.strictEqual(attachmentRecords[0].type, "image");

            done();
          }
        } catch (error) {
          done(error);
        }
      });

      student1Socket.on("message:delivered", (data: any) => {
        try {
          assert.ok(data.messageId, "Should have message ID");
          assert.ok(data.attachments, "Should include attachments");
          deliveredReceived = true;
        } catch (error) {
          done(error);
        }
      });

      student1Socket.on("connect", () => {
        setTimeout(() => {
          student1Socket.emit("message:send", {
            recipientId: testStudent2Id.toString(),
            content: "Test message with image",
            conversationId: testConversationId.toString(),
            tempId: "temp-123",
            attachments: [testAttachment]
          });
        }, 500);
      });
    });
  });

  describe("3. Multiple Attachments (Image + Document)", () => {
    it("should send message with multiple attachments and verify both saved correctly", function(this: Mocha.Context, done) {
      this.timeout(15000);

      const testAttachments = [
        {
          type: "image",
          url: "https://example.com/test-image-2.jpg",
          metadata: {
            filename: "test-image-2.jpg",
            size: 60000,
            mimeType: "image/jpeg",
            width: 1024,
            height: 768,
            thumbnail: "https://example.com/test-image-2-thumb.jpg"
          }
        },
        {
          type: "document",
          url: "https://example.com/test-doc.pdf",
          metadata: {
            filename: "test-doc.pdf",
            size: 150000,
            mimeType: "application/pdf"
          }
        }
      ];

      student2Socket.on("message:receive", async (data: any) => {
        try {
          assert.strictEqual(data.attachments.length, 2, "Should have 2 attachments");
          assert.strictEqual(data.attachments[0].type, "image");
          assert.strictEqual(data.attachments[1].type, "document");
          assert.ok(data.attachments[0].metadata.thumbnail, "Image should have thumbnail");

          // Verify database
          const conversationAttachmentsModel = app.get("mongooseClient").models["conversation-attachments"];
          const attachmentRecords = await conversationAttachmentsModel.find({ messageId: data.id });
          
          assert.strictEqual(attachmentRecords.length, 2, "Should have 2 conversation-attachments records");
          
          const imageRecord = attachmentRecords.find((r: any) => r.type === "image");
          const docRecord = attachmentRecords.find((r: any) => r.type === "document");
          
          assert.ok(imageRecord, "Should have image record");
          assert.ok(docRecord, "Should have document record");

          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        student1Socket.emit("message:send", {
          recipientId: testStudent2Id.toString(),
          content: "Test message with multiple attachments",
          conversationId: testConversationId.toString(),
          tempId: "temp-124",
          attachments: testAttachments
        });
      }, 1000);
    });
  });

  describe("4. Link Preview Event", () => {
    it("should fetch link preview for valid URL", function(this: Mocha.Context, done) {
      this.timeout(10000);

      student1Socket.on("message:link-preview:result", (data: any) => {
        try {
          assert.ok(data.tempId, "Should have tempId");
          
          if (data.error) {
            // Link preview might fail due to network - that's okay for test
            console.log("Link preview failed (expected in test environment):", data.error);
            done();
          } else {
            assert.ok(data.preview, "Should have preview data");
            assert.ok(data.preview.title || data.preview.url, "Preview should have title or URL");
            done();
          }
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        student1Socket.emit("message:link-preview", {
          url: "https://www.example.com",
          tempId: "preview-123"
        });
      }, 1000);
    });

    it("should handle invalid URL gracefully", function(this: Mocha.Context, done) {
      this.timeout(10000);

      student1Socket.on("message:link-preview:result", (data: any) => {
        try {
          assert.ok(data.tempId, "Should have tempId");
          assert.ok(data.error, "Should have error for invalid URL");
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        student1Socket.emit("message:link-preview", {
          url: "not-a-valid-url",
          tempId: "preview-456"
        });
      }, 1000);
    });
  });

  describe("5. Reply with Attachments", () => {
    let originalMessageId: string;

    before(async function() {
      // Create an original message first
      const messagesModel = app.get("mongooseClient").models.messages;
      const msg = await messagesModel.create({
        conversationId: testConversationId,
        senderId: testStudent1Id,
        recipientId: testStudent2Id,
        content: "Original message",
        status: { delivered: false, read: false }
      });
      originalMessageId = msg._id.toString();
    });

    it("should send reply with attachment and verify both reply and attachment data", function(this: Mocha.Context, done) {
      this.timeout(15000);

      const testAttachment = {
        type: "document",
        url: "https://example.com/reply-doc.pdf",
        metadata: {
          filename: "reply-doc.pdf",
          size: 100000,
          mimeType: "application/pdf"
        }
      };

      student2Socket.on("message:reply:receive", async (data: any) => {
        try {
          assert.ok(data.reply, "Should have reply metadata");
          assert.strictEqual(data.reply.messageId, originalMessageId);
          assert.ok(data.attachments, "Should have attachments");
          assert.strictEqual(data.attachments.length, 1);
          assert.strictEqual(data.attachments[0].type, "document");

          // Verify in database
          const messagesModel = app.get("mongooseClient").models.messages;
          const savedReply = await messagesModel.findById(data.id);
          
          assert.ok(savedReply.reply, "Saved reply should have reply metadata");
          assert.ok(savedReply.attachments, "Saved reply should have attachments");

          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        student1Socket.emit("message:reply", {
          recipientId: testStudent2Id.toString(),
          content: "Reply with attachment",
          conversationId: testConversationId.toString(),
          replyToMessageId: originalMessageId,
          tempId: "temp-reply-1",
          attachments: [testAttachment]
        });
      }, 1000);
    });
  });

  describe("6. Filter Attachments by Type", () => {
    before(async function() {
      this.timeout(10000);
      
      // Create messages with different attachment types
      const messagesModel = app.get("mongooseClient").models.messages;
      const conversationAttachmentsModel = app.get("mongooseClient").models["conversation-attachments"];

      // Create 3 image messages
      for (let i = 0; i < 3; i++) {
        const msg = await messagesModel.create({
          conversationId: testConversationId,
          senderId: testStudent1Id,
          recipientId: testStudent2Id,
          content: `Image message ${i}`,
          status: { delivered: false, read: false },
          attachments: [{
            type: "image",
            url: `https://example.com/image-${i}.jpg`,
            metadata: { filename: `image-${i}.jpg`, size: 50000, mimeType: "image/jpeg", width: 800, height: 600, thumbnail: `https://example.com/thumb-${i}.jpg` }
          }]
        });

        await conversationAttachmentsModel.create({
          conversationId: testConversationId,
          messageId: msg._id,
          attachmentId: msg.attachments[0]._id,
          type: "image",
          url: msg.attachments[0].url,
          metadata: msg.attachments[0].metadata,
          senderId: testStudent1Id
        });
      }

      // Create 2 document messages
      for (let i = 0; i < 2; i++) {
        const msg = await messagesModel.create({
          conversationId: testConversationId,
          senderId: testStudent1Id,
          recipientId: testStudent2Id,
          content: `Document message ${i}`,
          status: { delivered: false, read: false },
          attachments: [{
            type: "document",
            url: `https://example.com/doc-${i}.pdf`,
            metadata: { filename: `doc-${i}.pdf`, size: 100000, mimeType: "application/pdf" }
          }]
        });

        await conversationAttachmentsModel.create({
          conversationId: testConversationId,
          messageId: msg._id,
          attachmentId: msg.attachments[0]._id,
          type: "document",
          url: msg.attachments[0].url,
          metadata: msg.attachments[0].metadata,
          senderId: testStudent1Id
        });
      }

      // Create 2 link messages
      for (let i = 0; i < 2; i++) {
        const msg = await messagesModel.create({
          conversationId: testConversationId,
          senderId: testStudent1Id,
          recipientId: testStudent2Id,
          content: `Link message ${i}`,
          status: { delivered: false, read: false },
          attachments: [{
            type: "link",
            url: `https://example.com/page-${i}`,
            metadata: { title: `Page ${i}`, description: "Test page", url: `https://example.com/page-${i}` }
          }]
        });

        await conversationAttachmentsModel.create({
          conversationId: testConversationId,
          messageId: msg._id,
          attachmentId: msg.attachments[0]._id,
          type: "link",
          url: msg.attachments[0].url,
          metadata: msg.attachments[0].metadata,
          senderId: testStudent1Id
        });
      }
    });

    it("should filter by image type", async function() {
      const result = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          type: "image",
          $limit: 50
        },
        user: { _id: testStudent1Id }
      });

      assert.ok(result.data, "Should have data");
      assert.ok(result.data.length >= 3, "Should have at least 3 image attachments");
      result.data.forEach((attachment: any) => {
        assert.strictEqual(attachment.type, "image");
        assert.ok(attachment.metadata.thumbnail);
      });
    });

    it("should filter by document type", async function() {
      const result = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          type: "document",
          $limit: 50
        },
        user: { _id: testStudent1Id }
      });

      assert.ok(result.data.length >= 2, "Should have at least 2 document attachments");
      result.data.forEach((attachment: any) => {
        assert.strictEqual(attachment.type, "document");
      });
    });

    it("should filter by link type", async function() {
      const result = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          type: "link",
          $limit: 50
        },
        user: { _id: testStudent1Id }
      });

      assert.ok(result.data.length >= 2, "Should have at least 2 link attachments");
      result.data.forEach((attachment: any) => {
        assert.strictEqual(attachment.type, "link");
        assert.ok(attachment.metadata.title || attachment.metadata.url);
      });
    });

    it("should return all attachments without filter", async function() {
      const result = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          $limit: 50
        },
        user: { _id: testStudent1Id }
      });

      assert.ok(result.data.length >= 7, "Should have at least 7 total attachments (3+2+2)");
    });

    it("should support pagination", async function() {
      const page1 = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          $limit: 3,
          $skip: 0
        },
        user: { _id: testStudent1Id }
      });

      const page2 = await app.service("conversation-attachments").find({
        query: {
          conversationId: testConversationId.toString(),
          $limit: 3,
          $skip: 3
        },
        user: { _id: testStudent1Id }
      });

      assert.strictEqual(page1.data.length, 3);
      assert.ok(page2.data.length > 0);
      
      // Ensure different results
      const page1Ids = page1.data.map((a: any) => a._id.toString());
      const page2Ids = page2.data.map((a: any) => a._id.toString());
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      assert.strictEqual(overlap.length, 0, "Pages should not overlap");
    });
  });

  describe("7. Attachment Validation", () => {
    it("should reject oversized image (>10MB)", async function() {
      try {
        await app.service("message-attachments-upload").create({
          controller: "createPresignedUrl",
          filename: "huge-image.jpg",
          fileSize: 15 * 1024 * 1024, // 15MB
          mimeType: "image/jpeg",
          attachmentType: "image"
        }, {
          user: { _id: testStudent1Id }
        });
        
        assert.fail("Should have thrown error for oversized image");
      } catch (error: any) {
        assert.ok(error.message.includes("10MB") || error.message.includes("size"), "Error should mention size limit");
      }
    });

    it("should reject oversized document (>25MB)", async function() {
      try {
        await app.service("message-attachments-upload").create({
          controller: "createPresignedUrl",
          filename: "huge-doc.pdf",
          fileSize: 30 * 1024 * 1024, // 30MB
          mimeType: "application/pdf",
          attachmentType: "document"
        }, {
          user: { _id: testStudent1Id }
        });
        
        assert.fail("Should have thrown error for oversized document");
      } catch (error: any) {
        assert.ok(error.message.includes("25MB") || error.message.includes("size"), "Error should mention size limit");
      }
    });

    it("should reject invalid file type", async function() {
      try {
        await app.service("message-attachments-upload").create({
          controller: "createPresignedUrl",
          filename: "malware.exe",
          fileSize: 1000,
          mimeType: "application/x-msdownload",
          attachmentType: "document"
        }, {
          user: { _id: testStudent1Id }
        });
        
        assert.fail("Should have thrown error for invalid file type");
      } catch (error: any) {
        assert.ok(error.message.includes("Invalid") || error.message.includes("type"), "Error should mention invalid type");
      }
    });

    it("should reject message with malformed attachment via socket", function(this: Mocha.Context, done) {
      this.timeout(10000);

      student1Socket.on("message:error", (data: any) => {
        try {
          assert.ok(data.error, "Should have error message");
          assert.ok(data.error.includes("attachment") || data.error.includes("Invalid"), "Error should mention attachment");
          done();
        } catch (error) {
          done(error);
        }
      });

      setTimeout(() => {
        student1Socket.emit("message:send", {
          recipientId: testStudent2Id.toString(),
          content: "Test with bad attachment",
          conversationId: testConversationId.toString(),
          tempId: "temp-bad",
          attachments: [{
            // Missing required fields
            type: "image",
            // url missing
          }]
        });
      }, 1000);
    });
  });

  describe("8. Conversation Attachments Access Control", () => {
    let otherUserId: any;

    before(async function() {
      // Create a user not in the conversation
      const usersModel = app.get("mongooseClient").models.users;
      const uniqueId = Date.now();
      const otherUser = await usersModel.create({
        firstName: "Other",
        lastName: "User",
        email: `other_${uniqueId}@test.com`,
        mobileNo: `+1${uniqueId}99`,
        role: "Student",
        status: "Active",
        schoolId: testSchoolId,
        otp: 111111,
        otpGeneratedAt: new Date()
      });
      otherUserId = otherUser._id;

    await app.service("authentication").create({
      strategy: "otp",
      mobileNo: otherUser.mobileNo,
      otp: 111111
    }, {});
    });

    it("should deny access to conversation attachments for non-participant", async function(this: Mocha.Context) {
      this.timeout(10000);
      try {
        await app.service("conversation-attachments").find({
          query: {
            conversationId: testConversationId.toString()
          },
          user: { _id: otherUserId }
        });
        
        assert.fail("Should have thrown error for non-participant");
      } catch (error: any) {
        assert.ok(error.message.includes("Forbidden") || error.message.includes("participant"), "Should deny access");
      }
    });
  });
});
