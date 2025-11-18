import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import createSchoolsModel from "../../models/schools.model";
import createUsersModel from "../../models/users.model";
import { ISignupRequest, ISignupResponse } from "./signup.types";

export class Signup {
  app: Application;
  private schoolsModel: any;
  private usersModel: any;

  constructor(options: any, app: Application) {
    this.schoolsModel = createSchoolsModel(app);
    this.usersModel = createUsersModel(app);
    this.app = app;
  }

  async create(data: ISignupRequest): Promise<ISignupResponse> {
    const { firstName, lastName, email, phone, schoolName, schoolType, address, city } = data;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !schoolName || !schoolType || !address || !city) {
      throw new BadRequest("All fields are required");
    }

    // Check if user with email already exists
    const userExists = await this.usersModel.exists({
      email: email.toLowerCase(),
    });

    if (userExists) {
      throw new BadRequest("User with this email already exists");
    }

    // Check if user with phone already exists
    const phoneExists = await this.usersModel.exists({
      mobileNo: phone,
    });

    if (phoneExists) {
      throw new BadRequest("User with this phone number already exists");
    }

    try {
      // Step 1: Create the school
      const schoolDocument = new this.schoolsModel({
        schoolName,
        schoolType,
        address,
        city,
        status: "active",
      });

      const school = await schoolDocument.save();

      // Step 2: Create the admin user with schoolId
      const userDocument = new this.usersModel({
        firstName,
        lastName,
        email: email.toLowerCase(),
        mobileNo: phone,
        schoolId: school._id,
        role: "Admin",
        status: "Active",
      });

      const user = await userDocument.save();

      // Return both school and user information
      return {
        success: true,
        message: "School and admin account created successfully",
        school: {
          _id: school._id,
          schoolName: school.schoolName,
          schoolType: school.schoolType,
          status: school.status,
        },
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNo: user.mobileNo,
          role: user.role,
        },
      };
    } catch (error: any) {
      // If user creation fails after school creation, we might want to clean up
      // For now, we'll just throw the error
      throw new BadRequest(error.message || "Failed to create school and user");
    }
  }
}

