import { Application } from "@feathersjs/feathers";
import { LocationService } from "./locations.class";
import hooks from "./locations.hooks";

export default function(app: Application) {
  app.use("locations", new LocationService(app));
  const service = app.service("locations");
  service.hooks(hooks);
} 