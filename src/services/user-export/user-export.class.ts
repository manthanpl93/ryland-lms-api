import { Params, Paginated, NullableId, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import HttpErrors, { BadRequest } from "@feathersjs/errors";
import { Application } from "../../declarations";
import app from "../../app";
import usersModel from "../../models/users.model";
import xlsx from "xlsx";
import path from "path";

export class UserExport {
  async find(): Promise<any> {
    try {
      const users: any[] = await usersModel(app)
        .find()
        .populate("location")
        .populate("jobTitles", "name")
        .sort({ name: 1 })
        .lean();
      const usersExcelFormat: any[] = [];
      for (const user of users) {
        const userFormat = {
          FirstName: user?.name,
          LastName: user?.lastName,
          MobileNumber: user?.mobileNo,
          Email: user?.email,
          Roles: user?.roles?.join(","),
          JobTitles: user?.jobTitles?.map((j: any) => j.name).join(","),
          Designation: user?.designation,
          Location: user?.location?.name,
          Gender: user?.gender,
          Address: user?.address,
        };
        usersExcelFormat.push(userFormat);
      }
      const workbook = xlsx.utils.book_new();
      const workSheet = xlsx.utils.json_to_sheet(usersExcelFormat);
      const usersWorkBook = xlsx.utils.book_append_sheet(
        workbook,
        workSheet,
        "Users",
      );
      const filePath = path.join("public", "users.xlsx");
      const xlsxFile = xlsx.writeFile(workbook, filePath);
      return true;
    } catch (error) {
      throw error;
    }
  }
}
