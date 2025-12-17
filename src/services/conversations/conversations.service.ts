import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Conversations } from "./conversations.class";
import createModel from "../../models/conversations.model";
import hooks from "./conversations.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    conversations: Conversations & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize service
  app.use("/conversations", new Conversations(options, app));

  // Get service for hooks
  const service = app.service("conversations");
  service.hooks(hooks);
}
