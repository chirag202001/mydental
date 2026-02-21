/* ────────────────────────────────────────────────────────────────
   File storage abstraction – S3-compatible or local filesystem
   ──────────────────────────────────────────────────────────────── */

import { logger } from "@/lib/logger";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

/**
 * Upload a file. Currently stores to local /public/uploads.
 * Replace with S3 SDK when STORAGE_PROVIDER=s3 is configured.
 */
export async function uploadFile(
  file: File,
  clinicId: string,
  folder = "documents"
): Promise<UploadResult> {
  const ext = file.name.split(".").pop() ?? "bin";
  const key = `${clinicId}/${folder}/${uuid()}.${ext}`;

  if (process.env.STORAGE_PROVIDER === "s3") {
    // TODO: implement S3 upload
    logger.warn("S3 upload not implemented yet, falling back to local");
  }

  // Local upload
  const uploadDir = path.join(process.cwd(), "public", "uploads", clinicId, folder);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, `${uuid()}.${ext}`);
  await writeFile(filePath, buffer);

  const url = `/uploads/${key}`;

  return { url, key, size: buffer.length };
}
