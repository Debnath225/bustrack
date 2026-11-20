import { existsSync, mkdirSync, promises as fs } from "fs";
import { join, resolve } from "path";

/** Driver documents live outside the public folder and are only served through an admin endpoint. */
export const driverDocumentsDir = resolve(__dirname, "../../private_uploads/driver-access");
mkdirSync(driverDocumentsDir, { recursive: true });

// Stored names are generated as <uuid>.jpg|png. Anything else is rejected.
const STORED_NAME = /^[a-f0-9-]{36}\.(jpg|png)$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function getPrivateDriverDocumentPath(filename: string | null | undefined): string | null {
  if (!filename || !STORED_NAME.test(filename)) return null;
  return join(driverDocumentsDir, filename);
}

export async function removeDriverDocumentFiles(filenames: Array<string | null | undefined>): Promise<void> {
  for (const filename of filenames) {
    const path = getPrivateDriverDocumentPath(filename);
    if (!path) continue;
    try {
      await fs.unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Could not remove a driver document file.");
      }
    }
  }
}

/** Checks magic bytes, so a renamed file cannot pass as a JPG or PNG. */
export async function hasValidImageSignature(path: string, mimetype: string): Promise<boolean> {
  const bytes = await fs.readFile(path);
  if (mimetype === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
  }
  return false;
}

export function documentExists(filename: string): boolean {
  const path = getPrivateDriverDocumentPath(filename);
  return Boolean(path && existsSync(path));
}
