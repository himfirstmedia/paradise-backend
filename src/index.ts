
import http from "http";
import app from "./app";
import { config } from "./config/config";
import logger from "./config/logger";
import { seedDemoAccounts } from "./scripts/seedDemoAccounts"; // Add this import
import prisma from "./config/prisma"; // Import Prisma client

const server = http.createServer(app);

async function startServer() {
  try {
    
    await seedDemoAccounts();
    
    server.listen(config.port, () => {
      logger.info(
        config.env === "development"
          ? `Server started on http://localhost:${config.port}`
          : `Server is running on port ${config.port}`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

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
    server.close(() => {
      prisma.$disconnect(); // Ensure Prisma disconnects
    });
  }
});

// Start the server
startServer();