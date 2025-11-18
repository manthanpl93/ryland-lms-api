import { Params } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import usersModel from "../../models/users.model";
import { BadRequest } from "@feathersjs/errors";

export class EmailFinder {
  app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async find(params: Params) {
    try {
      const { mobileNo }: any = params?.query;
      const user = await usersModel(this.app).findOne({ mobileNo });
      if (!user) throw new BadRequest("No user found");
      return {
        email: user?.email,
      };
    } catch (error) {
      throw error;
    }
  }
}
