import type { Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { ok } from "../utils/respond";
import { parseOrThrow } from "../utils/validate";
import { getUploadedDriverDocuments } from "../middleware/driverDocumentUpload";
import * as auth from "../services/auth.service";
import * as access from "../services/driverAccess.service";
import {
  hasValidImageSignature,
  removeDriverDocumentFiles,
} from "../services/driverDocumentStorage";
import {
  credentialsSchema,
  driverAccessSchema,
  passwordChangeSchema,
  registerSchema,
} from "../validators/schemas";

export async function register(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(registerSchema, req.body, "Enter a valid name, email and password (8+ characters)");
  ok(res, await auth.registerPassenger(input), 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(credentialsSchema, req.body, "Enter a valid email and password");
  ok(res, await auth.login(input.email, input.password));
}

export async function me(req: Request, res: Response): Promise<void> {
  ok(res, await auth.getMe(req.user!.id));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = parseOrThrow(passwordChangeSchema, req.body, "Enter your current password and a new one (8+ characters).");
  await auth.changePassword(req.user!.id, input.currentPassword, input.newPassword);
  ok(res, { changed: true });
}

export async function submitDriverAccessRequest(req: Request, res: Response): Promise<void> {
  const uploads = getUploadedDriverDocuments(req);
  let keepUploads = false;
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const license = files?.drivingLicense?.[0];
    const aadhaar = files?.aadhaarCard?.[0];
    if (!license || !aadhaar) {
      throw new HttpError(400, "Add both a driving licence photo and an Aadhaar card photo.");
    }
    const validImages =
      (await hasValidImageSignature(license.path, license.mimetype)) &&
      (await hasValidImageSignature(aadhaar.path, aadhaar.mimetype));
    if (!validImages) throw new HttpError(400, "The selected documents must be valid JPG or PNG images.");

    const input = parseOrThrow(
      driverAccessSchema,
      req.body,
      "Enter valid contact details, choose a route and at least two stops, and attach both documents.",
    );
    const result = await access.submitAccessRequest(input, {
      drivingLicenseFile: license.filename,
      aadhaarCardFile: aadhaar.filename,
    });
    keepUploads = true;
    ok(res, result, 201);
  } finally {
    if (!keepUploads) await removeDriverDocumentFiles(uploads.map((file) => file.filename));
  }
}
