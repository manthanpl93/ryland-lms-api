// Initializes the `notification scheduler` service on path `/notification-scheduler`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { NotificationScheduler } from "./notification-scheduler.class";
import createModel from "../../models/notification-scheduler.model";
import hooks from "./notification-scheduler.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "notification-scheduler": NotificationScheduler & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/notification-scheduler", new NotificationScheduler(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("notification-scheduler");

  service.hooks(hooks);
}
