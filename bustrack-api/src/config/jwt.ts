import jwt from "jsonwebtoken";
import { env } from "./env";
import { ROLES, type UserRole } from "../constants";

export interface TokenUser {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export function createToken(user: TokenUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "bustrack-api",
    audience: "bustrack-app",
    algorithm: "HS256",
  });
}

export function readToken(token: string): TokenUser {
  if (!token || token.length > 4096) throw new Error("Invalid token");
  const payload = jwt.verify(token, env.JWT_SECRET, {
    issuer: "bustrack-api", audience: "bustrack-app", algorithms: ["HS256"],
  });
  if (typeof payload === "string" || typeof payload.id !== "string" ||
      typeof payload.email !== "string" || typeof payload.role !== "string" ||
      !ROLES.includes(payload.role as UserRole) ||
      !Number.isInteger(payload.tokenVersion) || Number(payload.tokenVersion) < 0) {
    throw new Error("Invalid token payload");
  }
  return { id: String(payload.id), email: String(payload.email), role: payload.role as UserRole, tokenVersion: Number(payload.tokenVersion) };
}
