import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import lockModel from "../../models/lock.model";
import app from "../../app";

export class Lock extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
  }

  async create(data:any, params?:any) {
    const { textboxId, userId } = data;

    const lock = lockModel(app);
    const existingLock = await lock.find({ textboxId });

    if (existingLock.length > 0) {
      // Text box is already locked
      return { locked: true, userId: existingLock[0].userId };
    } else {
      // Lock the text box
      await this.create({ textboxId, userId });
      return { locked: false, userId };
    }
  }
}
