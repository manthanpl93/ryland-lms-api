import { Params, NullableId, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import HttpErrors, { BadRequest } from "@feathersjs/errors";
import { Application } from "../../declarations";
import app from "../../app";
import createUsersModel from "../../models/users.model";
import createActivityLogModel from "../../models/activity-logs.model";
import {
  ICreateUserRequest,
  IUpdateUserRequest,
  IUserResponse,
  IUsersListResponse,
  IUserSearchParams,
} from "../../types/users.types";

export class Users extends Service {
  app: Application;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private usersModel: any;
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.usersModel = createUsersModel(app);
    this.app = app;
  }

  find(params?: any): Promise<any> {
    console.log("=== Users.find() method called ===");
    console.log("Params:", JSON.stringify(params, null, 2));
    const { controller } = params.query;
    console.log("Controller:", controller);
    console.log("Query:", params.query);

    // If no controller is provided, return all users (default behavior)
    if (!controller) {
      console.log(
        "No controller provided, calling fetchUsers with default params"
      );
      return fetchUsers(params, this.usersModel);
    }

    switch (controller) {
    case "authors":
      console.log("Calling fetchAllAuthors");
      return fetchAllAuthors(this.usersModel);
    case "users":
      console.log("Calling fetchUsers");
      return fetchUsers(params, this.usersModel);
    case "get-user-by-id":
      console.log("Calling fetchUserById");
      return this.fetchUserById(params?.query);
    case "revealOTP":
      console.log("Calling revealOTP");
      return revealOTP(params, this.usersModel);
    case "OtpRevealHistory":
      console.log("Calling getOtpRevealHistory");
      return getOtpRevealHistory(params);
    default:
      console.log("No controller matched, returning empty result");
      return Promise.resolve({});
    }
  }

  async get(id: Id): Promise<IUserResponse> {
    try {
      console.log("=== Users.get() method called ===");
      console.log("ID:", id);
      const user = await this.usersModel
        .findById(id)
        .populate(
          "coursesEnrolled",
          "-_id -userId courseId progressPercentage"
        );

      if (user) {
        return user;
      }
      throw new BadRequest("No user found");
    } catch (error) {
      throw error;
    }
  }

  async create(data: ICreateUserRequest, params?: Params): Promise<IUserResponse> {
    // Manage Batch Records
    const { controller, records } = data;

    if (controller === "inactive-batch-records" && records)
      return (await this.handleBatchInactiveUsers(records)) as any;

    const userExists = await createUsersModel(app).exists({
      $or: [{ email: data?.email }, { mobileNo: data?.mobileNo }],
    });
    if (userExists) {
      throw new BadRequest("User already exists");
    }

    // Automatically set schoolId from authenticated user
    if (params?.user?.schoolId) {
      data.schoolId = params.user.schoolId;
    }

    const model = createUsersModel(app);
    const document = new model(data);
    const user = await document.save();
    // await addSMSToQueue({
    //   mobileNo: data.mobileNo,
    //   message: getUserWelcomeMessage({
    //     firstName: data.firstName,
    //     lastName: data.lastName,
    //     role: data.role,
    //   }),
    // });
    return user;
  }

  async patch(id: any, data: IUpdateUserRequest): Promise<IUserResponse> {
    const { controller } = data;
    switch (controller) {
    case "update-details":
      delete data.controller;
      return await this.usersModel.findByIdAndUpdate(
        id,
        { ...data },
        { returnDocument: "after" }
      );

    default:
      const userExists = await createUsersModel(app).exists({
        $or: [{ email: data?.email }, { mobileNo: data?.mobileNo }],
        _id: { $ne: id },
      });
      if (userExists) {
        throw new BadRequest("User already exists");
      }

      const updatedDocument = await this.usersModel
        .findOneAndUpdate({ _id: id }, { $set: data })
        .exec();

      return updatedDocument;
    }
  }

  async deleteBulkUsers(userIds: string[]): Promise<boolean> {
    try {
      await this.usersModel.deleteMany({
        _id: { $in: userIds },
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  async remove(id: NullableId, params?: Params | undefined): Promise<any> {
    try {
      if (!params?.query?.controller) {
        return super.remove(id, params);
      } else {
        switch (params.query?.controller) {
        case "bulk_user_delete":
          return this.deleteBulkUsers(params.query?.userIds);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async handleBatchInactiveUsers(data: string): Promise<any> {
    const records = JSON.parse(data) ?? [];

    const mobileNos = records.map((r: any) => r.MobileNumber);

    for (const no of mobileNos) {
      await this.usersModel.findOneAndUpdate(
        { mobileNo: no },
        { status: "Inactive" }
      );
    }

    return {
      success: true,
      mobileNumbers: mobileNos,
      message: `Successfully updated ${mobileNos.length} users to inactive status`,
    };
  }

  async fetchUserById(params: any): Promise<IUserResponse> {
    return await this.usersModel.findById(params?.userId).lean();
  }
}

const fetchAllAuthors = async (usersModel: any): Promise<IUserResponse[]> => {
  return await usersModel.find({
    role: "Teacher",
  });
};

const fetchUsers = async (
  params: any,
  usersModel: any
): Promise<IUsersListResponse> => {
  // Authorization: Check if user is authenticated
  if (!params.user) {
    throw new BadRequest("User not authenticated");
  }
  
  // Authorization: Check if user is Admin
  if (params.user.role !== "Admin") {
    throw new HttpErrors.Forbidden("Only Admin users can access this resource");
  }
  
  const {
    name,
    role,
    status,
    skip = 0,
    limit = 0,
    sortQuery = { firstName: 1 },
    searchBy,
  } = params?.query as IUserSearchParams;

  const filter: any = {};

  // Filter by schoolId for Admin users (required)
  if (params.user.schoolId) {
    filter["schoolId"] = params.user.schoolId;
    console.log("Filtering by schoolId:", params.user.schoolId);
  }

  if (name) {
    let searchField;
    if (searchBy === "mobileNo" || /^[0-9]{10}$/.test(name))
      searchField = "mobileNo";
    else if (
      searchBy === "email" ||
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(name)
    )
      searchField = "email";
    else searchField = "firstName";

    if (searchField === "firstName") {
      filter["$or"] = [
        {
          firstName: {
            $regex: new RegExp(name, "i"),
          },
        },
        {
          lastName: {
            $regex: new RegExp(name, "i"),
          },
        },
      ];
    } else {
      filter[searchField] = {
        $regex: new RegExp(name, "i"),
      };
    }

    // Also search in legacy fields for backward compatibility
    filter["$or"] = [
      {
        firstName: {
          $regex: new RegExp(name, "i"),
        },
      },
      {
        lastName: {
          $regex: new RegExp(name, "i"),
        },
      },
      {
        email: {
          $regex: new RegExp(name, "i"),
        },
      },
      {
        mobileNo: {
          $regex: new RegExp(name, "i"),
        },
      },
    ];
  }

  if (role) {
    filter["role"] = role;
  }

  if (status) filter["status"] = status;

  console.log(filter);
  console.log(sortQuery);

  const records: IUserResponse[] = await usersModel
    .find(filter)
    .sort(sortQuery)
    .limit(limit)
    .skip(skip)
    .exec();

  const total: number = await usersModel.countDocuments(filter);

  return {
    data: records,
    skip: +skip,
    limit: +limit,
    total,
  };
};

export const getUserWelcomeMessage = ({
  firstName,
  lastName,
  role,
}: {
  firstName: string;
  lastName: string;
  role: string;
}): string => {
  return `Congratulations ${firstName} ${lastName} , You are now added in LMS as ${role.charAt(0).toUpperCase() + role.slice(1)}. To get started, go to `;
};

const revealOTP = async (params: any, usersModel: any): Promise<any> => {
  let resp: any = {};

  if (params.user.role === "Admin" && params.headers.role === "admin") {
    resp = await usersModel
      .findById(params.query.userId)
      .select("otp otpGeneratedAt")
      .lean();
  } else throw new HttpErrors.BadRequest("User not allowed to view OTP");

  const model = createActivityLogModel(app);
  const document = new model({
    activity: "otpReveal",
    byUser: params.user._id,
    forUser: params.query.userId,
  });
  await document.save();
  return resp;
};

const getOtpRevealHistory = async (params: any): Promise<any> => {
  const { limit = 10, page, filter = {} } = params?.query;

  const queryFilter: any = {};

  if (filter?.admins?.length) {
    queryFilter["byUser"] = {
      $in: filter?.admins,
    };
  }
  if (filter?.users?.length) {
    queryFilter["forUser"] = {
      $in: filter?.users,
    };
  }

  const activities = (await createActivityLogModel(app)
    .find({
      ...queryFilter,
      activity: "otpReveal",
    })
    .limit(10)
    .skip((page || 0) * limit)
    .populate("byUser", "_id name lastName email")
    .populate("forUser", "_id name lastName email")
    .sort({ createdAt: -1 })
    .lean()) as any;

  const total = await createActivityLogModel(app).countDocuments({
    ...queryFilter,
    activity: "otpReveal",
  });

  return {
    total,
    activities,
  };
};
