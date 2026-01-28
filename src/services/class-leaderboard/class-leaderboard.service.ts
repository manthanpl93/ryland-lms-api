/**
 * Class Leaderboard Service
 * 
 * Initializes the `class-leaderboard` service on path `/class-leaderboard`
 */

import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ClassLeaderboard } from "./class-leaderboard.class";
import createModel from "../../models/class-leaderboard.model";
import hooks from "./class-leaderboard.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "class-leaderboard": ClassLeaderboard & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/class-leaderboard", new ClassLeaderboard(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("class-leaderboard");

  service.hooks(hooks);
}
