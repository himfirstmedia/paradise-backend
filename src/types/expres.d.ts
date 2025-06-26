import { User as DbUser } from "@prisma/client";
import { Send } from "express";

declare module "express-session" {
  interface SessionData {
    messages?: string[];
  }
}
declare global {
  namespace Express {
    interface User extends DbUser {}

    interface Response {
      sendEncrypted: (data: any, status?: number) => void;
    }
  }
}
