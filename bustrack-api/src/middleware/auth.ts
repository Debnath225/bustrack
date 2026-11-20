import type { NextFunction, Request, Response } from "express";
import { readToken } from "../config/jwt";
import type { UserRole } from "../constants";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Sign in required" });
    return;
  }
  try {
    req.user = readToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired or invalid" });
  }
}

export function allowRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "You do not have permission" });
      return;
    }
    next();
  };
}
