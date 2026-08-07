import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { HttpError } from "./error";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "লগইন প্রয়োজন");
  }
  req.userId = verifyToken(header.slice("Bearer ".length), "access");
  next();
}
