// Initializes the `class-teachers` service on path `/class-teachers`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ClassTeachers } from "./class-teachers.class";
import createModel from "../../models/class-teachers.model";
import hooks from "./class-teachers.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "class-teachers": ClassTeachers & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/class-teachers", new ClassTeachers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("class-teachers");

  service.hooks(hooks(app));
}

