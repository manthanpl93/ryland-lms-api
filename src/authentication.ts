import createApplication, { ServiceAddons } from "@feathersjs/feathers";
import {
  AuthenticationService,
  JWTStrategy,
  AuthenticationBaseStrategy,
  AuthenticationRequest,
  AuthenticationResult,
} from "@feathersjs/authentication";
import { LocalStrategy } from "@feathersjs/authentication-local";
import { expressOauth } from "@feathersjs/authentication-oauth";
import HttpErrors from "@feathersjs/errors";
import moment from "moment-timezone";

import { Application } from "./declarations";
import getUsersModel from "./models/users.model";
import app from "./app";
import { AppConstants } from "./utils/constants";
import App from "./app";

declare module "./declarations" {
  interface ServiceTypes {
    authentication: AuthenticationService & ServiceAddons<any>;
  }
}

class OTPAuthenticationStrategy extends AuthenticationBaseStrategy {
  async authenticate(
    authentication: AuthenticationRequest,
    params: createApplication.Params
  ): Promise<AuthenticationResult> {
    const { mobileNo, otp, socketId } = authentication;

    const user = await validateOTP(mobileNo, otp);

    const result: AuthenticationResult = {
      authentication: { strategy: this.name },
      user, // This should be the user object from your database or user service
    };

    try {
      const socket = app.io.sockets.sockets[socketId];
      socket.disconnect(true);
    } catch (err) {
      console.log("error occurred while disconnecting socket", err);
    }

    return Promise.resolve(result);
  }
}

const validateOTP = async (mobileNo: string, otp: number): Promise<any> => {
  if (!mobileNo) throw new HttpErrors.NotAuthenticated("Invalid mobile no");
  const user = await getUsersModel(app)
    .findOne({ $or: [{ mobileNo: mobileNo }, { email: mobileNo }] })
    .select(
      "_id firstName lastName email mobileNo schoolId role status otp otpGeneratedAt"
    )
    .lean();

  if (!user) throw new HttpErrors.NotAuthenticated("Invalid user or OTP");

  const loginSecret = app.get("loginSecret");

  // Helper function to return only required fields
  const getCleanUserData = (userData: any) => ({
    _id: userData._id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
    mobileNo: userData.mobileNo,
    schoolId: userData.schoolId,
    role: userData.role,
  });

  if (otp && otp === loginSecret) {
    return getCleanUserData(user);
  }

  if (!otp || !user.otp || !user.otpGeneratedAt)
    throw new HttpErrors.NotAuthenticated("Invalid user or OTP");

  const otpGeneratedAt = moment(user.otpGeneratedAt);
  if (moment().diff(otpGeneratedAt, "millisecond") > AppConstants.OTP_TIMEOUT)
    throw new HttpErrors.NotAuthenticated("OTP expired");

  if (user.otp !== otp) throw new HttpErrors.NotAuthenticated("Incorrect OTP");

  await getUsersModel(app).findOneAndUpdate(
    { _id: user._id },
    { $set: { otp: null, otpGeneratedAt: null } }
  );

  // Return only required fields
  return getCleanUserData(user);
};

export default function (app: Application): void {
  const authentication = new AuthenticationService(app);

  authentication.register("jwt", new JWTStrategy());
  authentication.register("local", new LocalStrategy());
  authentication.register("otp", new OTPAuthenticationStrategy());

  app.use("/authentication", authentication);
  app.configure(expressOauth());
}
