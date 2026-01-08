// Initializes the `forum-feed` service on path `/forum-feed`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumFeed } from "./forum-feed.class";
import hooks from "./forum-feed.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-feed": ForumFeed & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/forum-feed", new ForumFeed(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-feed");

  service.hooks(hooks);
}

