import morgan from "morgan";

import { config } from "./config";
import logger from "./logger";
import { Request, Response } from "express";

const logFilePath = "./logs/app.log";
morgan.token(
  "message",
  (req: Request, res: Response) => res.locals.errorMessage || ""
);

const getIpFormat = () =>
  config.env === "production" ? ":remote-addr - " : "";
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

const successHandler = morgan(successResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode >= 400,
  stream: {
    write: (message: any) => {
      logger.info(message.trim());
    },
  },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode < 400,
  stream: { write: (message: any) => logger.error(message.trim()) },
});

export default {
  successHandler,
  errorHandler,
};
