// Initializes the `lessons-move` service on path `/lessons-move`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { LessonsMove } from "./lessons-move.class";
import createModel from "../../models/courses.model";
import hooks from "./lessons-move.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "lessons-move": LessonsMove & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/lessons-move", new LessonsMove(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("lessons-move");

  service.hooks(hooks);
}
