// Initializes the `forget-password` service on path `/forget-password`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForgetPassword } from "./forget-password.class";
import createModel from "../../models/forget-password.model";
import hooks from "./forget-password.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forget-password": ForgetPassword & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate")
  };

  // Initialize our service with any options it requires
  app.use("/forget-password", new ForgetPassword(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forget-password");

  service.hooks(hooks);
}
