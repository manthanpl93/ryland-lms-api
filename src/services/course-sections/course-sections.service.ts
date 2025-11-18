// Initializes the `course-sections` service on path `/course-sections`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { CourseSections } from "./course-sections.class";
import createModel from "../../models/courses.model";
import hooks from "./course-sections.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "course-sections": CourseSections & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/course-sections", new CourseSections(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("course-sections");

  service.hooks(hooks);
}

