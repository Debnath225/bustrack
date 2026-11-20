import type { ZodType } from "zod";
import { HttpError } from "./httpError";

/** Parses input with a zod schema, or throws a 400 with a friendly message. */
export function parseOrThrow<T>(schema: ZodType<T, any, any>, data: unknown, message: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(400, message);
  return result.data;
}
