// Initializes the `users` service on path `/users`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { UserExport } from "./user-export.class";
import createModel from "../../models/users.model";
import hooks from "./user-export.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    userExport: UserExport & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {};

  // Initialize our service with any options it requires

  app.use("/user-export", new UserExport());

  // Get our initialized service so that we can register hooks
  const service: any = app.service("user-export");

  service.hooks(hooks);
}
