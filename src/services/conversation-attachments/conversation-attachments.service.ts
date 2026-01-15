import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ConversationAttachments } from "./conversation-attachments.class";
import createModel from "../../models/conversation-attachments.model";
import hooks from "./conversation-attachments.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    "conversation-attachments": ConversationAttachments & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize the service
  app.use("/conversation-attachments", new ConversationAttachments(options, app));

  // Get the initialized service
  const service = app.service("conversation-attachments");

  service.hooks(hooks);
}
