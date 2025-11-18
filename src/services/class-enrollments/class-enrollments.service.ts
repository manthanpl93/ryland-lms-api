// Initializes the `class-enrollments` service on path `/class-enrollments`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ClassEnrollments } from "./class-enrollments.class";
import createModel from "../../models/class-enrollments.model";
import hooks from "./class-enrollments.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "class-enrollments": ClassEnrollments & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/class-enrollments", new ClassEnrollments(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("class-enrollments");

  service.hooks(hooks(app));
}

