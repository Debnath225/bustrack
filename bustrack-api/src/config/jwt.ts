import jwt from "jsonwebtoken";
import { env } from "./env";
import type { UserRole } from "../constants";

export interface TokenUser {
  id: string;
  email: string;
  role: UserRole;
}

export function createToken(user: TokenUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function readToken(token: string): TokenUser {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || !payload.id || !payload.role) {
    throw new Error("Invalid token payload");
  }
  return { id: String(payload.id), email: String(payload.email), role: payload.role as UserRole };
}
