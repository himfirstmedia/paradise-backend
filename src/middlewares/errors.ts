import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import httpStatus from "http-status";

import { config } from "../config/config";
import logger from "../config/logger";
import { ApiError } from "../utils/api_error";
export const errorConverter = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: {
    statusCode: number;
    message: string;
    stack?: string;
  } = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    // const statusCode = error.statusCode
    //   ? httpStatus.BAD_REQUEST
    //   : httpStatus.INTERNAL_SERVER_ERROR;
    const message =
      error.message || httpStatus[statusCode as keyof typeof httpStatus];
    error = new ApiError(statusCode, message as string, err.stack);
  }
  next(error);
};
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode, message } = err;
  if (config.env === "production" && !err.isOperational) {
    statusCode =
      statusCode == 401 || statusCode == 403
        ? statusCode
        : httpStatus.INTERNAL_SERVER_ERROR;
    message = message || httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }
  console.log(statusCode);

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === "development" && { stack: err.stack }),
  };

  if (config.env === "development") {
    logger.error(err);
  }

  res.status(statusCode).send(response);
};
