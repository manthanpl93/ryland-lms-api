// Initializes the `forum-posts` service on path `/forum-posts`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumPosts } from "./forum-posts.class";
import createModel from "../../models/forum-posts.model";
import hooks from "./forum-posts.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-posts": ForumPosts & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/forum-posts", new ForumPosts(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-posts");

  service.hooks(hooks);
}

