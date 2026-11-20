import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { driverDocumentStorageAvailable, driverDocumentsDir, removeDriverDocumentFiles } from "../services/driverDocumentStorage";

const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, driverDocumentsDir),
    filename: (_req, file, callback) =>
      callback(null, `${randomUUID()}${file.mimetype === "image/png" ? ".png" : ".jpg"}`),
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
    fields: 8,
    fieldSize: 16 * 1024,
    parts: 12,
  },
  fileFilter: (_req, file, callback) => {
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Upload JPG or PNG images only."));
      return;
    }
    callback(null, true);
  },
});

const documentFields = upload.fields([
  { name: "drivingLicense", maxCount: 1 },
  { name: "aadhaarCard", maxCount: 1 },
]);

export function getUploadedDriverDocuments(req: Request): Express.Multer.File[] {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return Object.values(files ?? {}).flat();
}

/** Parses the two document images. Rejected uploads are deleted from disk. */
export function parseDriverDocuments(req: Request, res: Response, next: NextFunction): void {
  if (!driverDocumentStorageAvailable) {
    res.status(503).json({
      success: false,
      message: "Private driver-document storage is not configured for this serverless deployment. Configure durable private object storage before accepting identity documents.",
    });
    return;
  }

  documentFields(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const fileNames = getUploadedDriverDocuments(req).map((file) => file.filename);
    void removeDriverDocumentFiles(fileNames).then(() => {
      if (error instanceof multer.MulterError) {
        res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
          success: false,
          message: "Upload one JPG or PNG image for each document, up to 5 MB per image.",
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    });
  });
}
