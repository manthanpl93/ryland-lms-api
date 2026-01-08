// Initializes the `forum-tags` service on path `/forum-tags`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumTags } from "./forum-tags.class";
import createModel from "../../models/forum-tags.model";
import hooks from "./forum-tags.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-tags": ForumTags & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$search"],
  };

  // Initialize our service with any options it requires
  app.use("/forum-tags", new ForumTags(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-tags");

  service.hooks(hooks);
}

