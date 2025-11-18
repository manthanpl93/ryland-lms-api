import mongoose from "mongoose";
import { Application } from "./declarations";
import logger from "./logger";

export default function (app: Application): void {
  const options: mongoose.ConnectOptions = {
    tls: true,
    tlsCAFile: "./global-bundle.pem", // Path to your CA file
    retryWrites: false,
  };

  const mongodb = app.get("mongodb");

  mongoose
    .connect(
      `${mongodb.CONNECTION_STRING}/${mongodb.DB_NAME}?authSource=admin`,
      {},
    )
    .then(() => {
      logger.info("DB Connected!");
      console.log("DB Connected!");
    })
    .catch((err: any) => {
      console.log("Error", err);
      logger.error(err);
      process.exit(1);
    });

  app.set("mongooseClient", mongoose);
}
