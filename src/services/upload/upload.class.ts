import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
import { generatePresignedUrl } from "../../utils/upload-helper";
import mongoose from "mongoose";
import path from "path";
import encode from "../../utils/encode";
import createUploadModel from "../../models/upload.model";
import createUsersModel from "../../models/users.model";
import {
  getSocketById,
  setBulkUploadDataByUserId,
  getBulkUploadDataByUserId,
  removeBulkUploadDataByUserId,
  getSocketIdsByUserId,
} from "../../socket/sockets";
import { getUserWelcomeMessage } from "../users/users.class";
import { addSMSToQueue } from "../../processors";

const appConfig = feathers().configure(configuration());
export class Upload extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  private uploadModel: any;
  private usersModel: any;
  app: Application;
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.uploadModel = createUploadModel(app);
    this.usersModel = createUsersModel(app);
    this.app = app;
  }

  find(params?: any): any {
    if (params.query.controller) {
      switch (params.query.controller) {
      case "getBulkUploadDataStatus":
        return getBulkUploadDataStatus(params);
      }
    }
    return {};
  }
  async create(data: any, params: Params) {
    if (data.controller) {
      switch (data.controller) {
      case "createS3URL":
        return createS3URL(data);
      case "notifyFileUploaded":
        return notifyFileUploaded(data);
      case "upload-batch-records":
        return bulkUploadUsers(data, params, this.app);
      case "validateUserBulkUploadFile":
        return validateUserBulkUploadFile(data, params, this.app);
      }
    }
  }
  async patch(id: any, data: any, params?: any): Promise<any> {
    const updatedDocument = await this.uploadModel
      .findOneAndUpdate({ _id: id }, { $set: data })
      .exec();

    return updatedDocument;
  }
}

const isFileVideo = (type: string) => {
  return type.includes("video");
};
const createS3URL = async (data: any) => {
  const { name, size, type, path = "" } = data;
  console.log("path", path);
  const sanitizedString = name.replace(/[^a-zA-Z0-9_.]/g, "_");
  const directory = path ? (path.endsWith("/") ? path : path + "/") : "";
  return await generatePresignedUrl(`${directory}${sanitizedString}`);
};

const notifyFileUploaded = async (data: any) => {
  const { type = "", uri = "", uploadId = "" } = data;
  if (isFileVideo(type)) {
    encode(uri, uploadId);
  }
  return {};
};

const bulkUploadUsers = async (data: any, params: any, app: any) => {
  const userId = params.user._id;
  const { records: userRecords, socketId } = data;
  const records = JSON.parse(userRecords);

  const categories: any = await app.service("categories").find(params);

  const jobTitles = categories.filter((c: any) => c.type == "job-title");
  const locations = categories.filter((c: any) => c.type == "location");
  const convertToNumeric = (inputString: any) => {
    // Remove non-numeric characters using regular expression
    const numericString = inputString.replace(/\D/g, "");

    // Convert the result to a number
    const numericValue = numericString;

    return numericValue;
  };

  const parseRecord = (rec: any) => {
    const verifyRoles = (r: string) => {
      if (!r) return [];
      return r.split(",").map((r: string) => r.toLowerCase().trim());
    };

    const verifyJobTitles = (r: string) => {
      if (!r) return [];
      const titles = r.split(",").map((r: string) => r.trim());

      return titles.reduce((acc: any, t: any) => {
        const title = jobTitles.find(
          (j: any) => j.name.toLowerCase() === t.toLowerCase()
        );
        if (title) acc.push(title._id);
        return acc;
      }, []);
    };

    const verifyLocation = (r: string) => {
      const location = locations.find(
        (j: any) => j.abbreviation.toLowerCase() === r.trim().toLowerCase()
      );
      return location ? location._id : null;
    };

    return {
      name: rec.FirstName,
      lastName: rec.LastName,
      mobileNo: convertToNumeric(rec.MobileNumber),
      email: rec.Email,
      address: rec.Address,
      designation: rec.Designation,
      roles: verifyRoles(rec.Roles),
      jobTitles: verifyJobTitles(rec.JobTitles),
      location: verifyLocation(rec.Location),
      status: "active",
    };
  };

  const batchRecords = records
    .filter((r: any) => !r.isError)
    .map((r: any) => parseRecord(r));
  setBulkUploadDataByUserId(userId, batchRecords);
  startBulkUploadForSocket(params, app);
  return {};
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);
  // const res = await this.Model.deleteMany({ createdAt: { $gte: today } });
  // console.log(res);
  // return await this.Model.insertMany(batchRecords);
};

const startBulkUploadForSocket = async (params: any, app: any) => {
  const userId = params.user._id;

  const sendEvent = (socket: any, eventName: any, eventData: any) => {
    socket.emit(eventName, eventData);
  };

  const sendEventToSockets = (sockets: any, eventName: any, eventData: any) => {
    sockets.forEach((socket: any) => sendEvent(socket, eventName, eventData));
  };

  const sendEventToSocketIds = (
    socketIds: any,
    eventName: any,
    eventData: any
  ) => {
    const sockets = socketIds.map((socketId: any) => getSocketById(socketId));
    sendEventToSockets(sockets, eventName, eventData);
  };

  let socketIds = getSocketIdsByUserId(params.user._id);

  const records = getBulkUploadDataByUserId(userId);
  const upload = async (user: any) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`uploaded user ${user}`);
      }, 3000);
    });
  };

  const addUser = async (user: any) => {
    // await upload({});
    const userRecord = await createUsersModel(app).create(user);
    const { mobileNo, name, lastName, role } = userRecord;
    const message = getUserWelcomeMessage({ firstName: name, lastName, role });
    // await addSMSToQueue({
    //   mobileNo,
    //   message,
    // });
  };

  const total = records.length;
  const completed: any[] = [];
  const error: any[] = [];
  for (const user of records) {
    try {
      // const resp = await upload(user);
      await addUser(user);
      completed.push(user.mobileNo);
      user.completed = true;
    } catch (err) {
      console.log("error while bulk upload", err);
      error.push(user.mobileNo);
    }
    try {
      if (!socketIds.length) socketIds = getSocketIdsByUserId(params.user._id);
      sendEventToSocketIds(socketIds, "bulkUploadProgress", {
        total,
        completed,
        error,
      });
    } catch (e) {
      socketIds = getSocketIdsByUserId(params.user._id);
    }
  }
  removeBulkUploadDataByUserId(userId);
};

const getBulkUploadDataStatus = async (params: any) => {
  const { socketId, isSendData } = params.query;
  const usersData = getBulkUploadDataByUserId(params.user._id);
  return Promise.resolve({
    total: usersData?.length ?? 0,
    data: isSendData ? usersData ?? [] : [],
  });
  // return {
  //   total: usersData?.length ?? 0,
  //   data: usersData ?? [],
  // };
};

const validateUserBulkUploadFile = async (data: any, params: any, app: any) => {
  const { records, isForInActive = false } = data;
  const categories: any = await app.service("categories").find(params);

  const jobTitles = categories.filter((c: any) => c.type == "job-title");
  const locations = categories.filter((c: any) => c.type == "location");

  const existingMobileNoAndEmail = await createUsersModel(app)
    .find({
      $or: [
        { email: { $in: records.map((r: any) => r.Email) } },
        { mobileNo: { $in: records.map((r: any) => r.MobileNumber) } },
      ],
    })
    .select("_id mobileNo email");
  const convertToNumeric = (inputString: any) => {
    // Remove non-numeric characters using regular expression
    const numericString = inputString.replace(/\D/g, "");

    // Convert the result to a number
    const numericValue = numericString;

    return numericValue;
  };

  const parseRecord = (rec: any) => {
    const verifyRoles = (r: string) => {
      const availableRoles = ["admin", "author", "student"];
      if (!r) return "At least one role is required";
      const assignedRoles = r
        .split(",")
        .map((r: string) => r.toLowerCase().trim());
      const allRolesValid = assignedRoles.every((role) =>
        availableRoles.includes(role)
      );
      return allRolesValid ? "" : "Invalid role assigned";
    };

    const verifyJobTitles = (r: string) => {
      if (!r) return "Job title is required";
      const titles = r.split(",").map((r: string) => r.trim());

      const assignedTitles = titles.reduce((acc: any, t: any) => {
        const title = jobTitles.find(
          (j: any) => j.name.toLowerCase() === t.toLowerCase()
        );
        if (title) acc.push(title._id);
        return acc;
      }, []);
      return assignedTitles.length > 0 &&
        titles.length === assignedTitles.length
        ? ""
        : "Invalid job title provided";
    };

    const verifyLocation = (r: string) => {
      const location = locations.find(
        (j: any) => j.abbreviation.toLowerCase() === r.trim().toLowerCase()
      );
      return location ? "" : "Invalid location provided";
    };

    const verifyOnlyAlpha = (v: string) => {
      return /^[a-zA-Z\s-]+$/.test(v) ? "" : "Only alphabets are allowed";
    };

    const verifyMobileNo = (m: string) => {
      m = convertToNumeric(m);
      if (!/^[0-9]{10}$/.test(m)) return "Mobile no must be 10 digit number";
      const exist = existingMobileNoAndEmail.find((el) => el.mobileNo === m);
      if (exist) return "Mobile no already exist";
      if (records.filter((r: any) => r.MobileNumber === m).length > 1)
        return "Duplicate mobile no in uploaded file";
    };
    const verifyMobileNoForInactive = (m: string) => {
      m = convertToNumeric(m);
      if (!/^[0-9]{10}$/.test(m)) return "Mobile no must be 10 digit number";
      const exist = existingMobileNoAndEmail.find((el) => el.mobileNo === m);
      if (!exist) return "Mobile does not exists";
      if (records.filter((r: any) => r.MobileNumber === m).length > 1)
        return "Duplicate mobile no in uploaded file";
    };

    const verifyEmail = (e: string) => {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e))
        return "Invalid email address";
      const exist = existingMobileNoAndEmail.find((el) => el.email === e);
      if (exist) return "Email already exist";
      if (records.filter((r: any) => r.Email === e).length > 1)
        return "Duplicate email in uploaded file";
    };
    const verifyEmailForInActive = (e: string) => {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e))
        return "Invalid email address";
      const exist = existingMobileNoAndEmail.find((el) => el.email === e);
      if (!exist) return "Email does not exists";
      if (records.filter((r: any) => r.Email === e).length > 1)
        return "Duplicate email in uploaded file";
    };

    const fieldValidators = {
      FirstName: verifyOnlyAlpha,
      LastName: verifyOnlyAlpha,
      MobileNumber: isForInActive ? verifyMobileNoForInactive : verifyMobileNo,
      Email: isForInActive ? verifyEmailForInActive : verifyEmail,
      Address: () => "",
      Designation: () => "",
      Roles: verifyRoles,
      JobTitles: verifyJobTitles,
      Location: verifyLocation,
    };

    const errorFields: any = {};
    for (const [field, fn] of Object.entries(fieldValidators)) {
      const message = fn(rec[field]);
      if (message) errorFields[field] = message;
      else if (!rec[field])
        errorFields[field] = "This field can not be left blank";
    }

    return errorFields;
  };

  const recordsWithError: any = {};
  try {
    data.records.forEach((r: any) => {
      const errors = parseRecord(r);
      if (Object.keys(errors).length) recordsWithError[r.idx] = errors;
    });
    return Promise.resolve(recordsWithError);
  } catch (err) {
    console.log("err ======", err);
  }
};
