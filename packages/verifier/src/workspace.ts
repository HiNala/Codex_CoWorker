export interface VerifierWorkspace {
  /** Relative path → file contents (source + fixtures + manifest). */
  files: Record<string, string>;
  /** Fixture paths as they were when the workspace was assembled. */
  fixtureHashes: Record<string, string>;
  /** Expected capability slug from the build spec. */
  slug: string;
  /** Expected version. */
  version: string;
  /** Declared permissions snapshot from the spec. */
  permissions: {
    network: false;
    filesystem: "none";
    evidenceRead: boolean;
    maxDurationMs: number;
    maxMemoryMb: number;
    maxOutputBytes: number;
  };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  /** Trusted fixture cases (name, input, expected). */
  trustedTests: Array<{ name: string; input: unknown; expected: unknown }>;
  /** Optional pure execute function for in-process gates (fakes / unit tests). */
  execute?: (input: unknown) => Promise<unknown> | unknown;
}

export async function sha256Hex(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashFixtures(
  files: Record<string, string>,
  fixturePrefix = "fixtures/",
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const normalized = path.replaceAll("\\", "/");
    if (normalized.startsWith(fixturePrefix) || normalized.startsWith("packages/capability-fixtures/")) {
      out[normalized] = await sha256Hex(content);
    }
  }
  return out;
}
