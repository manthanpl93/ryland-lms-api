// Initializes the `admin-classes` service on path `/admin-classes`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { AdminClasses } from "./admin-classes.class";
import createModel from "../../models/classes.model";
import hooks from "./admin-classes.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "admin-classes": AdminClasses & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/admin-classes", new AdminClasses(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("admin-classes");

  service.hooks(hooks);
}

