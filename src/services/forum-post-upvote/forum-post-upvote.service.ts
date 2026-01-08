// Initializes the `forum-post-upvote` service on path `/forum-post-upvote`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumPostUpvote } from "./forum-post-upvote.class";
import hooks from "./forum-post-upvote.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-post-upvote": ForumPostUpvote & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/forum-post-upvote", new ForumPostUpvote(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-post-upvote");

  service.hooks(hooks);
}

