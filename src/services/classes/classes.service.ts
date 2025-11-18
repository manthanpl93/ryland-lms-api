// Initializes the `classes` service on path `/classes`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Classes } from "./classes.class";
import createModel from "../../models/classes.model";
import hooks from "./classes.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    classes: Classes & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/classes", new Classes(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("classes");

  service.hooks(hooks);
}

