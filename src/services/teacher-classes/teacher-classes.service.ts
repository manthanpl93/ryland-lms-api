// Initializes the `teacher-classes` service on path `/teacher-classes`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { TeacherClasses } from "./teacher-classes.class";
import createModel from "../../models/classes.model";
import hooks from "./teacher-classes.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "teacher-classes": TeacherClasses & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/teacher-classes", new TeacherClasses(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("teacher-classes");

  service.hooks(hooks);
}

