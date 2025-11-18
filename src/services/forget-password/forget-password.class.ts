import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Paginated, Params, NullableId, Query } from "@feathersjs/feathers";
import bcrypt from "bcryptjs";
import createUsersModel from "../../models/users.model";
import app from "../../app";
import HttpErrors from "@feathersjs/errors";
import moment from "moment-timezone";
import * as crypto from "crypto";
import { AppConstants } from "../../utils/constants";
import { addSMSToQueue } from "../../processors";
import { sendEmail } from "../../utils/email";

export class ForgetPassword extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private usersModel: any;
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.usersModel = createUsersModel(app);
  }

  async find(params: Params): Promise<any | Paginated<any>> {
    try {
      console.log("forgot password", params?.query);
      const { controller, resetToken } = params.query as {
        controller: string;
        resetToken: string;
      };

      if (controller) {
        switch (controller) {
        case "revealOTP":
          return fetchOTP(params.query ?? {}, this.usersModel);
        case "login-with-otp":
          return loginWithOTP(params.query ?? {}, this.usersModel);
        case "login-with-email-otp":
          return await emailLoginOtp(params);
        }
      } else {
        const valid = await validateToken(resetToken, this.usersModel);
        if (!valid) throw new HttpErrors.BadRequest("Invalid token");
      }
      return {};
    } catch (e) {
      console.log("Error", e);
      throw e;
    }
  }

  async create(data: any, params: Params) {
    const { email } = data;

    const user = await this.usersModel.findOne({ email });
    if (!user) throw new HttpErrors.BadRequest("Email not found");

    const resetPasswordToken = crypto
      .randomBytes(32)
      .toString("hex")
      .substring(0, 10);
    await this.usersModel.findOneAndUpdate(
      { _id: user._id },
      {
        $set: { resetPasswordToken, resetPasswordTokenGeneratedAt: new Date() },
      },
    );

    return {};
  }

  async patch(id: NullableId, data: any, params: Params) {
    const { resetToken, newPassword } = data;
    const valid = validateToken(resetToken, this.usersModel);

    if (!valid) throw new HttpErrors.BadRequest("Invalid token");

    const passwordHash = bcrypt.hashSync(newPassword);
    await this.usersModel.findOneAndUpdate(
      { resetPasswordToken: resetToken },
      {
        $set: {
          password: passwordHash,
          resetPasswordToken: null,
          resetPasswordTokenGeneratedAt: null,
        },
      },
    );
    return {};
  }
}

const validateToken = async (resetToken: string, usersModel: any) => {
  const RESET_TOKEN_TIMEOUT = 24 * 60 * 60 * 1000; // 24 Hour

  const user = await usersModel.findOne({
    resetPasswordToken: resetToken,
  });
  if (!user || !user.resetPasswordToken || !user.resetPasswordTokenGeneratedAt)
    throw new HttpErrors.BadRequest("Invalid token");

  const resetTokenGeneratedAt = moment(user.resetPasswordTokenGeneratedAt);
  const diff = moment().diff(resetTokenGeneratedAt, "millisecond");
  if (diff > RESET_TOKEN_TIMEOUT)
    throw new HttpErrors.BadRequest("Password reset token expired");

  return user.resetPasswordToken === resetToken;
};

const fetchOTP = async (data: Query, usersModel: any) => {
  const { mobileNo, token } = data;
  const otpRevealToken = app.get("OTPRevealAuthCode");
  if (otpRevealToken !== token)
    throw new HttpErrors.BadRequest("Invalid OTP reveal auth token");
  const user = await usersModel.findOne({ mobileNo });
  if (!user) throw new HttpErrors.BadRequest("User not found");
  if (!user.otp) throw new HttpErrors.BadRequest("OTP not generated");
  return {
    mobileNo,
    otp: user?.otp,
  };
};

export const generateOTPForLogin = async (mobileNo: any, usersModel: any) => {
  function generateSixDigitRandom() {
    // The smallest 6-digit number is 100000 and the largest is 999999
    const min = 100000;
    const max = 999999;

    // Generate a random number between min (inclusive) and max (inclusive)
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  if (!mobileNo) throw new HttpErrors.BadRequest("Mobile no not found");
  const user = await usersModel.findOne({ mobileNo });
  console.log("user", user);
  if (!user) {
    throw new HttpErrors.BadRequest("User not found");
  }
  if (user?.status === "in-active") {
    throw new HttpErrors.BadRequest("Not allowed, Please contact HR");
  }
  // if (user?.otp && user?.otpGeneratedAt) {
  //   if (moment().isBefore(moment(user?.otpGeneratedAt).add(2, "minutes"))) {
  //     throw new HttpErrors.BadRequest("Otp exists");
  //   }
  // }
  const otp = generateSixDigitRandom();
  await usersModel.findOneAndUpdate(
    { _id: user._id },
    { $set: { otp, otpGeneratedAt: new Date() } },
  );

  const message = `${otp} is the OTP for login into LMS, valid for ${
    AppConstants.OTP_TIMEOUT / (1000 * 60)
  } minutes.`;
  return message;
};

const loginWithOTP = async ({ mobileNo, socketId }: any, usersModel: any) => {
  const message = await generateOTPForLogin(mobileNo, usersModel);
  console.log("generateOTPForLogin done ---------------");
  const extraData = { action: "loginWithOTP", socketId };

  await addSMSToQueue({
    mobileNo,
    message,
    extraData,
  });
  console.log("addSMSToQueue done ---------");
  return {};
};
function generateSixDigitRandom() {
  // The smallest 6-digit number is 100000 and the largest is 999999
  const min = 100000;
  const max = 999999;

  // Generate a random number between min (inclusive) and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1) + min);
}
const emailLoginOtp = async (data: any) => {
  console.log("reach ", data);
  const { email = "" } = data?.query;
  if (!email) throw new HttpErrors.NotAuthenticated("provide email");
  const user = await createUsersModel(app).findOne({
    email,
  });
  if (!user) throw new HttpErrors.NotAuthenticated("user not found");
  const otp = generateSixDigitRandom();
  await createUsersModel(app).findOneAndUpdate(
    {
      email,
    },
    {
      $set: {
        otp,
        otpGeneratedAt: new Date(),
      },
    },
  );
  await sendEmail({
    to: user?.email,
    subject: "Login Otp",
    message: `<p>Your Login otp is ${otp}`,
    attachments: [],
  });
  return "sent email otp";
};

export const loginWithOTPSMSAction = {
  onSuccess: (extraData: any, app: any) => {
    const { socketId } = extraData;
    const socket = app.io.sockets.sockets[socketId];
    socket.emit("smsState", { status: "sent" });
  },
  onFailure: (extraData: any, exception: any, app: any) => {
    const { socketId } = extraData;
    const socket = app.io.sockets.sockets[socketId];
    socket.emit("smsState", {
      status: "error",
      error: "Something went wrong while sending OTP message",
    });
  },
};
