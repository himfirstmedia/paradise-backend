import http from "http";
import app from "./app";
import { config } from "./config/config";
import logger from "./config/logger";
const server = http.createServer(app);
server.listen(config.port, () => {
  console.log(
    config.env == "development"
      ? `server started on http://localhost:${config.port}`
      : "Server is running on port " + config.port
  );
});
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};
const unexpectedErrorHandler = (error: unknown) => {
  logger.error(error);
  exitHandler();
};
process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close();
  }
});
