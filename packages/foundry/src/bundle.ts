import { createHash } from "node:crypto";

/**
 * Deterministic content-addressed bundle: sorted paths, no mtimes.
 * Returns gzip-less tar-like payload bytes + sha256 for registry rows.
 */
export function packBundle(files: Record<string, string>): { bytes: Buffer; sha256: string } {
  const entries = Object.keys(files)
    .sort()
    .map((path) => {
      const body = files[path] ?? "";
      return `${path}\n${body.length}\n${body}`;
    });
  const bytes = Buffer.from(entries.join("\n--\n"), "utf8");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { bytes, sha256 };
}

export function verifyBundleHash(files: Record<string, string>, expectedSha256: string): boolean {
  return packBundle(files).sha256 === expectedSha256;
}
