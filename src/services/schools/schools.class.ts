import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import createSchoolsModel from "../../models/schools.model";
import { ICreateSchoolRequest, IUpdateSchoolRequest, ISchoolResponse } from "./schools.types";

export class Schools extends Service {
  app: Application;
  private schoolsModel: any;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.schoolsModel = createSchoolsModel(app);
    this.app = app;
  }

  async create(data: ICreateSchoolRequest): Promise<ISchoolResponse> {
    const model = this.schoolsModel;
    const document = new model(data);
    const school = await document.save();
    
    return school;
  }

  async find(params?: any): Promise<ISchoolResponse[]> {
    const filter: any = { isDeleted: false };
    
    // Add any additional filters from query
    if (params?.query?.status) {
      filter.status = params.query.status;
    }
    
    if (params?.query?.schoolType) {
      filter.schoolType = params.query.schoolType;
    }

    const schools = await this.schoolsModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
    
    return schools;
  }

  async get(id: string): Promise<ISchoolResponse> {
    const school = await this.schoolsModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!school) {
      throw new BadRequest("School not found");
    }

    return school;
  }

  async patch(id: string, data: IUpdateSchoolRequest): Promise<ISchoolResponse> {
    const school = await this.schoolsModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: data },
        { new: true, runValidators: true }
      )
      .exec();

    if (!school) {
      throw new BadRequest("School not found");
    }

    return school;
  }

  async remove(id: string): Promise<ISchoolResponse> {
    // Soft delete
    const school = await this.schoolsModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true }
      )
      .exec();

    if (!school) {
      throw new BadRequest("School not found");
    }

    return school;
  }
}

