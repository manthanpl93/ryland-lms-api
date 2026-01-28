// Initializes the `course-sections-reorder` service on path `/course-sections-reorder`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { CourseSectionsReorder } from "./course-sections-reorder.class";
import createModel from "../../models/courses.model";
import hooks from "./course-sections-reorder.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "course-sections-reorder": CourseSectionsReorder & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/course-sections-reorder", new CourseSectionsReorder(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("course-sections-reorder");

  service.hooks(hooks);
}
