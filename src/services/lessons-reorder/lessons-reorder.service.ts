// Initializes the `lessons-reorder` service on path `/lessons-reorder`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { LessonsReorder } from "./lessons-reorder.class";
import createModel from "../../models/courses.model";
import hooks from "./lessons-reorder.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "lessons-reorder": LessonsReorder & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/lessons-reorder", new LessonsReorder(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("lessons-reorder");

  service.hooks(hooks);
}
