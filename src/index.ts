import logger from "./logger";
import app from "./app";
import scheduler from "./scheduler";

const port = app.get("port");
const server = app.listen(port);

// Store server reference in app for chat socket initialization
app.set("server", server);

const initializeChatSocket = require("./socket/chatSocket");

process.on("unhandledRejection", (reason, p) =>
  logger.error("Unhandled Rejection at: Promise ", p, reason)
);

server.on("listening", () => {
  logger.info(
    "Feathers application started on http://%s:%d",
    app.get("host"),
    port
  );

  // Initialize chat socket server
  initializeChatSocket(app);

  scheduler();
  require("./processors/index");
});
