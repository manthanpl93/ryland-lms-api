import { Application } from "../../declarations";
import { EmailFinder } from "./email-finder.class";

export default function (app: Application) {
  app.use("/email-finder", new EmailFinder(app));

  const service = app.service("email-finder");
}
