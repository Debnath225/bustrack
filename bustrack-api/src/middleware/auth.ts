import type { NextFunction, Request, Response } from "express";
import { readToken } from "../config/jwt";
import type { UserRole } from "../constants";
import { User } from "../models/User";
import { Types } from "mongoose";

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ") || header.length > 4103) {
    res.status(401).json({ success: false, message: "Sign in required" });
    return;
  }
  let tokenUser;
  try {
    tokenUser = readToken(header.slice(7));
    if (!Types.ObjectId.isValid(tokenUser.id)) throw new Error("Invalid token subject");
  } catch {
    res.status(401).json({ success: false, message: "Session expired or invalid" });
    return;
  }

  // Re-check current account state so role changes, suspensions and password resets
  // take effect immediately instead of waiting for the JWT to expire.
  const current = await User.findById(tokenUser.id).select("role driverStatus +tokenVersion").lean();
  if (!current || current.role !== tokenUser.role || (current.tokenVersion ?? 0) !== tokenUser.tokenVersion ||
      (current.role === "driver" && current.driverStatus !== "approved")) {
    res.status(401).json({ success: false, message: "Session expired or account access changed. Sign in again." });
    return;
  }
  req.user = tokenUser;
  next();
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
