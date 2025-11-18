import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Paginated, Params } from "@feathersjs/feathers";

export class Categories extends Service {
  app: Application;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params | undefined): Promise<any[] | Paginated<any>> {
    return await this.Model.find({});
  }
}
