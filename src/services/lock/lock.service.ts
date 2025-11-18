// Initializes the `lock` service on path `/lock`
import { ServiceAddons } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { Lock } from "./lock.class";
import createModel from "../../models/lock.model";
import hooks from "./lock.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    lock: Lock & ServiceAddons<any>;
  }
}

export default function (app: Application): void {
  const options = {
    Model: createModel(app),
    paginate: app.get("paginate"),
  };

  // Initialize our service with any options it requires
  app.use("/lock", new Lock(options, app));

  const service = app.service("lock");

  const lockService = app.service("/lock") as any;

  lockService.updateOrInsert = async function (query: any, data: any) {
    const result = await lockService.Model.findOneAndUpdate(query, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return result;
  };

  service.hooks(hooks);
}
