import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { MessageAttachmentsUpload } from "./message-attachments-upload.class";
import hooks from "./message-attachments-upload.hooks";

declare module "../../declarations" {
  interface ServiceTypes {
    "message-attachments-upload": MessageAttachmentsUpload & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {};

  // Initialize the service
  app.use("/message-attachments-upload", new MessageAttachmentsUpload(app));

  // Get the initialized service
  const service = app.service("message-attachments-upload");

  service.hooks(hooks);
}
