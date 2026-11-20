import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { HttpError } from "../utils/httpError";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: "Endpoint not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = "Unexpected server error";

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = "Upload one JPG or PNG image for each document, up to 5 MB per image.";
  } else if (err instanceof SyntaxError && (err as { type?: string }).type === "entity.parse.failed") {
    status = 400;
    message = "Request body contains invalid JSON.";
  } else if ((err as { code?: number }).code === 11000) {
    status = 409;
    message = "A record with these details already exists.";
  } else if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    status = 400;
    message = "Some fields are invalid.";
  }

  if (status >= 500) {
    logger.error({ err }, "Request failed");
    if (env.NODE_ENV !== "production" && err instanceof Error) message = err.message;
  } else {
    logger.warn({ status, message }, "Request rejected");
  }

  res.status(status).json({ success: false, message });
}
