import { NextFunction, Request, Response } from "express";

export const catchAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((e) => next(e));
  };
