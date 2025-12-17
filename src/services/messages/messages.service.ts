import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Messages } from "./messages.class";
import createModel from "../../models/messages.model";
import hooks from "./messages.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    messages: Messages & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize service
  app.use("/messages", new Messages(options, app));

  // Get service for hooks
  const service = app.service("messages");
  service.hooks(hooks);
}
