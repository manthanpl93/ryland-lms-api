import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { ForumClasses } from "./forum-classes.class";
import hooks from "./forum-classes.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "forum/classes": ForumClasses & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    paginate: false
  };

  // Initialize our service with any options it requires
  app.use("/forum/classes", new ForumClasses(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("forum/classes");

  service.hooks(hooks(app));
}

