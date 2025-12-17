import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { MessagingContactsService } from "./messaging-contacts.class";
import hooks from "./messaging-contacts.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    "messaging-contacts": MessagingContactsService & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get("paginate"),
  };

  // Initialize service
  app.use("/messaging-contacts", new MessagingContactsService(options, app));

  // Get service instance
  const service = app.service("messaging-contacts");

  // Apply hooks
  service.hooks(hooks);
}
