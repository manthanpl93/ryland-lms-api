// Initializes the `users` service on path `/users`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { EnrolCourse } from "./enrol-course.class";
import hooks from "./enrol-course.hooks";
import createModel from "../../models/course-preview.model";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "enrol-course": EnrolCourse & ServiceAddons<any>;
  }
}
export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/enrol-course", new EnrolCourse(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("enrol-course");

  service.hooks(hooks);
}
