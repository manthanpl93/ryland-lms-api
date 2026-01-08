// Initializes the `forum-post-comments` service on path `/forum-post-comments`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumPostComments } from "./forum-post-comments.class";
import createModel from "../../models/forum-post-comments.model";
import hooks from "./forum-post-comments.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-post-comments": ForumPostComments & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/forum-post-comments", new ForumPostComments(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-post-comments");

  service.hooks(hooks);
}

