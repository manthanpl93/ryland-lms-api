// Initializes the `approved-courses` service on path `/approved-courses`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ApprovedCourses } from "./approved-courses.class";
import createModel from "../../models/approved-courses.model";
import hooks from "./approved-courses.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "approved-courses": ApprovedCourses & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/approved-courses", new ApprovedCourses(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("approved-courses");

  service.hooks(hooks);
}
