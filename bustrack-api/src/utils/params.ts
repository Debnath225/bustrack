import type { Request } from "express";
import { HttpError } from "./httpError";
import { OBJECT_ID_PATTERN } from "./ids";

const OBJECT_ID_PARAMS = new Set(["routeId", "bookingId", "driverId", "requestId"]);
const BUS_ID_PATTERN = /^[A-Za-z0-9_-]{3,24}$/;

/** Express 5 may type route params as string | string[]. Reject ambiguous or malformed values. */
export function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0 || value.length > 128) {
    throw new HttpError(400, `Invalid ${name}.`);
  }
  if (OBJECT_ID_PARAMS.has(name) && !OBJECT_ID_PATTERN.test(value)) {
    throw new HttpError(400, `Invalid ${name}.`);
  }
  if (name === "busId" && !BUS_ID_PATTERN.test(value)) {
    throw new HttpError(400, "Invalid busId.");
  }
  return value;
}
