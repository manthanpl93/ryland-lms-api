// Initializes the `forum-comment-upvote` service on path `/forum-comment-upvote`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumCommentUpvote } from "./forum-comment-upvote.class";
import hooks from "./forum-comment-upvote.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum-comment-upvote": ForumCommentUpvote & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/forum-comment-upvote", new ForumCommentUpvote(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum-comment-upvote");

  service.hooks(hooks);
}

