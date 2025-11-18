// Initializes the `schools` service on path `/schools`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Schools } from "./schools.class";
import createModel from "../../models/schools.model";
import hooks from "./schools.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    schools: Schools & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort"],
  };

  // Initialize our service with any options it requires
  app.use("/schools", new Schools(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("schools");

  service.hooks(hooks);
}

