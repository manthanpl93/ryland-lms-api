// Initializes the `signup` service on path `/signup`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Signup } from "./signup.class";
import hooks from "./signup.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    signup: Signup & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/signup", new Signup(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("signup");

  service.hooks(hooks);
}

