import { createHash } from "node:crypto";

/** SHA-256 hex digest of a UTF-8 string. */
export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Byte length of a UTF-8 string (not JS string length). */
export function contentByteLength(content: string): number {
  return Buffer.byteLength(content, "utf8");
}
