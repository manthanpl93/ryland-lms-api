// Initializes the `published-courses` service on path `/published-courses`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { PublishedCourses } from "./published-courses.class";
import createModel from "../../models/published-courses.model";
import hooks from "./published-courses.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    "published-courses": PublishedCourses & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/published-courses", new PublishedCourses(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service("published-courses");

  service.hooks(hooks);
}






