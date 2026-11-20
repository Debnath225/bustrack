import { HttpError } from "./httpError";

export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/** Throws 404 for malformed ids so Mongo never sees an invalid ObjectId. */
export function assertObjectId(value: string, message = "Not found."): void {
  if (!isObjectId(value)) throw new HttpError(404, message);
}
