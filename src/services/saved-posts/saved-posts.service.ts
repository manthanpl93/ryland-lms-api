// Initializes the `saved-posts` service on path `/saved-posts`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { SavedPosts } from "./saved-posts.class";
import createModel from "../../models/saved-posts.model";
import hooks from "./saved-posts.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "saved-posts": SavedPosts & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
    whitelist: ["$regex", "$options", "$sort", "$in", "$populate"],
  };

  // Initialize our service with any options it requires
  app.use("/saved-posts", new SavedPosts(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("saved-posts");

  service.hooks(hooks);
}

