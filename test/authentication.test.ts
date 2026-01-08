import assert from "assert";
import app from "../src/app";

describe("authentication", () => {
  it("registered the authentication service", () => {
    assert.ok(app.service("authentication"));
  });
  
  describe("OTP strategy", () => {
    const uniqueId = Date.now();
    const testOTP = 111111;
    const mobileNo = `+1${uniqueId}${Math.random().toString().substr(2, 6)}`;
    
    let testUserId: any;

    before(async () => {
      try {
        const usersModel = app.get("mongooseClient").models.users;
        const user = await usersModel.create({
          firstName: "Test",
          lastName: "User",
          email: `test_auth_${uniqueId}@example.com`,
          mobileNo: mobileNo,
          role: "Student",
          status: "Active",
          otp: testOTP,
          otpGeneratedAt: new Date()
        });
        testUserId = user._id;
      } catch (error) {
        // Do nothing, it just means the user already exists
      }
    });

    after(async () => {
      if (testUserId) {
        const usersModel = app.get("mongooseClient").models.users;
        await usersModel.deleteOne({ _id: testUserId });
      }
    });

    it("authenticates user with mobile and OTP, creates accessToken", async () => {
      const { user, accessToken } = await app.service("authentication").create({
        strategy: "otp",
        mobileNo: mobileNo,
        otp: testOTP
      }, {});
      
      assert.ok(accessToken, "Created access token for user");
      assert.ok(user, "Includes user in authentication data");
      assert.strictEqual(user.mobileNo, mobileNo, "User mobile number matches");
    });
  });
});
