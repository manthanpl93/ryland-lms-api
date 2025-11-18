import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import { Params, Paginated, NullableId } from "@feathersjs/feathers";
import moment from "moment-timezone";

export class Notifications extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
  }

  async find(
    params?: Params | undefined | any
  ): Promise<any[] | Paginated<any>> {
    const { controller } = params?.query;

    if (controller) {
      switch (controller) {
      case "user-notifications":
        return await this.fetchUserNotifications(params?.query);

      default:
        return super.find(params);
      }
    }
    return super.find(params);
  }

  async patch(
    id: NullableId,
    data: Partial<any>,
    params?: Params | undefined
  ): Promise<any> {
    const { controller } = data;
    switch (controller) {
    case "mark-all-as-read":
      return await this.updateMarkAllAsRead(data);
    case "update-notification-as-read":
      return await this.updateNotificationReadStatus(id);

    default:
      return await super.patch(id, data, params);
    }
  }

  async fetchUserNotifications(params: any) {
    return await this.Model.find({ user: params?.userId })
      .populate("course", "_id title")
      .populate("done_by", "_id name")
      .sort({ createdAt: -1 });
  }

  async updateMarkAllAsRead(data: any) {
    const { userId } = data;

    return await this.Model.updateMany(
      { user: userId },
      { read: true, read_at: moment().format("YYYY-MM-DD HH:mm:ss") }
    );
  }

  async updateNotificationReadStatus(id: any) {
    return await this.Model.findByIdAndUpdate(id, {
      read: true,
      read_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    });
  }
}
