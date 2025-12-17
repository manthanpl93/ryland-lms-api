// Initializes the `course-lessons` service on path `/course-lessons`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { CourseLessons } from "./course-lessons.class";
import hooks from "./course-lessons.hooks";
import createModel from "../../models/student-progress.model";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "course-lessons": CourseLessons & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in"],
  };

  // Initialize our service with any options it requires
  app.use("/course-lessons", new CourseLessons(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("course-lessons");

  service.hooks(hooks);
}

