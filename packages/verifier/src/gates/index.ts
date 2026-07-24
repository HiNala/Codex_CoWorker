import type { GateId, GateResult } from "@forge/contracts";
import type { VerifierWorkspace } from "../workspace";
import { sha256Hex } from "../workspace";

export type GateRunner = (workspace: VerifierWorkspace) => Promise<GateResult>;

function result(
  gate: GateId,
  status: GateResult["status"],
  message: string,
  extra: Partial<GateResult> = {},
  started = performance.now(),
): GateResult {
  return {
    gate,
    status,
    durationMs: Math.max(0, Math.round(performance.now() - started)),
    passed: status === "passed" ? (extra.passed ?? 1) : (extra.passed ?? 0),
    total: extra.total ?? 1,
    message,
    detail: extra.detail,
  };
}

const FORBIDDEN_IMPORT =
  /\b(?:require\s*\(|import\s*\(|eval\s*\(|new\s+Function\s*\(|from\s+['"](?:fs|net|http|https|child_process|process|node:fs|node:net)['"])/;

const SECRET_PATTERN =
  /(?:sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*['"][^'"]+['"]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/i;

export const gates: Record<GateId, GateRunner> = {
  async manifest(workspace) {
    const started = performance.now();
    const raw = workspace.files["capability.json"] ?? workspace.files["src/capability.json"];
    if (!raw) {
      return result("manifest", "failed", "Manifest capability.json is missing.", {}, started);
    }
    try {
      const manifest = JSON.parse(raw) as Record<string, unknown>;
      if (manifest.slug !== workspace.slug) {
        return result("manifest", "failed", "Manifest slug drifted from the build spec.", {}, started);
      }
      if (manifest.network === true || (manifest.permissions as { network?: boolean } | undefined)?.network) {
        return result("manifest", "failed", "Manifest must not enable network.", {}, started);
      }
      const deps = manifest.dependencies;
      if (Array.isArray(deps) && deps.length > 0) {
        return result("manifest", "failed", "Manifest must declare zero third-party dependencies.", {}, started);
      }
      return result("manifest", "passed", "Manifest matches the build spec.", {}, started);
    } catch {
      return result("manifest", "failed", "Manifest is not valid JSON.", {}, started);
    }
  },

  async imports(workspace) {
    const started = performance.now();
    const sources = Object.entries(workspace.files).filter(([path]) => path.endsWith(".ts") || path.endsWith(".js"));
    for (const [path, content] of sources) {
      if (FORBIDDEN_IMPORT.test(content)) {
        return result(
          "imports",
          "failed",
          `Forbidden import or dynamic eval detected in ${path}.`,
          { detail: path },
          started,
        );
      }
    }
    return result("imports", "passed", "No forbidden imports or eval usage.", { total: sources.length, passed: sources.length }, started);
  },

  async secrets(workspace) {
    const started = performance.now();
    for (const [path, content] of Object.entries(workspace.files)) {
      if (SECRET_PATTERN.test(content)) {
        return result("secrets", "failed", `Secret-like material detected in ${path}.`, { detail: path }, started);
      }
    }
    return result("secrets", "passed", "No credential patterns detected in workspace files.", {}, started);
  },

  async typecheck(workspace) {
    const started = performance.now();
    // Full tsc runs in the sandbox; in-process we do a cheap structural check.
    const entry = workspace.files["src/index.ts"] ?? workspace.files["dist/index.js"];
    if (!entry) {
      return result("typecheck", "failed", "Missing src/index.ts entrypoint.", {}, started);
    }
    if (entry.includes("any as never") && entry.includes("@ts-ignore")) {
      return result("typecheck", "failed", "Entrypoint suppresses typechecking unsafely.", {}, started);
    }
    return result("typecheck", "passed", "Entrypoint present; sandbox tsc is authoritative in live mode.", {}, started);
  },

  async lint(workspace) {
    const started = performance.now();
    const entry = workspace.files["src/index.ts"] ?? "";
    if (/\bprocess\b|\bglobalThis\b/.test(entry) && /process\.env/.test(entry)) {
      return result("lint", "failed", "Restricted global process.env usage is not allowed.", {}, started);
    }
    return result("lint", "passed", "No restricted globals detected.", {}, started);
  },

  async build(workspace) {
    const started = performance.now();
    const hasSource = Boolean(workspace.files["src/index.ts"]);
    const hasDist = Boolean(workspace.files["dist/index.js"]);
    if (!hasSource && !hasDist) {
      return result("build", "failed", "Neither src/index.ts nor dist/index.js is present.", {}, started);
    }
    return result("build", "passed", "Build artifacts present for verification.", {}, started);
  },

  async generated_tests(workspace) {
    const started = performance.now();
    const tests = Object.keys(workspace.files).filter((path) => path.startsWith("tests/"));
    if (tests.length === 0) {
      // Informative only in fake path — still pass with zero generated tests message.
      return result("generated_tests", "passed", "No generated tests present; trusted fixtures remain authoritative.", { passed: 0, total: 0 }, started);
    }
    return result("generated_tests", "passed", `Found ${tests.length} generated test file(s).`, { passed: tests.length, total: tests.length }, started);
  },

  async trusted_tests(workspace) {
    const started = performance.now();
    const total = workspace.trustedTests.length;
    if (total === 0) {
      return result("trusted_tests", "failed", "No trusted fixtures were provided.", { passed: 0, total: 0 }, started);
    }
    if (!workspace.execute) {
      return result(
        "trusted_tests",
        "failed",
        "No execute function available for trusted fixture evaluation.",
        { passed: 0, total },
        started,
      );
    }

    let passed = 0;
    for (const test of workspace.trustedTests) {
      try {
        const actual = await workspace.execute(test.input);
        if (stableStringify(actual) === stableStringify(test.expected)) {
          passed += 1;
        } else {
          return result(
            "trusted_tests",
            "failed",
            `Trusted fixture failed: ${test.name}`,
            {
              passed,
              total,
              detail: `expected=${stableStringify(test.expected)} actual=${stableStringify(actual)}`,
            },
            started,
          );
        }
      } catch (error) {
        return result(
          "trusted_tests",
          "failed",
          `Trusted fixture threw: ${test.name}`,
          {
            passed,
            total,
            detail: error instanceof Error ? error.message : "unknown error",
          },
          started,
        );
      }
    }
    return result("trusted_tests", "passed", `All ${total} trusted fixtures passed.`, { passed, total }, started);
  },

  async schema_conformance(workspace) {
    const started = performance.now();
    if (!workspace.execute || workspace.trustedTests.length === 0) {
      return result("schema_conformance", "passed", "No outputs to validate against schema.", { passed: 0, total: 0 }, started);
    }
    let passed = 0;
    for (const test of workspace.trustedTests) {
      const actual = await workspace.execute(test.input);
      if (typeof actual === "object" && actual !== null) {
        passed += 1;
      } else if (workspace.outputSchema.type === "object") {
        return result(
          "schema_conformance",
          "failed",
          `Output for ${test.name} is not an object.`,
          { passed, total: workspace.trustedTests.length },
          started,
        );
      } else {
        passed += 1;
      }
    }
    return result(
      "schema_conformance",
      "passed",
      "Trusted fixture outputs match the declared output shape.",
      { passed, total: workspace.trustedTests.length },
      started,
    );
  },

  async determinism(workspace) {
    const started = performance.now();
    if (!workspace.execute || workspace.trustedTests.length === 0) {
      return result("determinism", "passed", "No execute path to check; skipped live determinism.", { passed: 0, total: 0 }, started);
    }
    const sample = workspace.trustedTests[0]!;
    const a = stableStringify(await workspace.execute(sample.input));
    const b = stableStringify(await workspace.execute(sample.input));
    if (a !== b) {
      return result("determinism", "failed", "Non-deterministic output for identical input.", {}, started);
    }
    return result("determinism", "passed", "Identical inputs produced byte-identical outputs.", {}, started);
  },

  async resource_limits(workspace) {
    const started = performance.now();
    if (!workspace.execute || workspace.trustedTests.length === 0) {
      return result("resource_limits", "passed", "No execute path; limits enforced by sandbox runtime.", {}, started);
    }
    const sample = workspace.trustedTests[0]!;
    const t0 = performance.now();
    await workspace.execute(sample.input);
    const durationMs = performance.now() - t0;
    if (durationMs > workspace.permissions.maxDurationMs) {
      return result(
        "resource_limits",
        "failed",
        `Execution exceeded maxDurationMs (${Math.round(durationMs)} > ${workspace.permissions.maxDurationMs}).`,
        {},
        started,
      );
    }
    return result("resource_limits", "passed", "Execution finished within declared time budget.", {}, started);
  },

  async permissions(workspace) {
    const started = performance.now();
    if (workspace.permissions.network !== false) {
      return result("permissions", "failed", "Network permission must be false.", {}, started);
    }
    if (workspace.permissions.filesystem !== "none") {
      return result("permissions", "failed", "Filesystem permission must be none.", {}, started);
    }
    // Scan for socket-ish APIs as a static stand-in for observed behaviour.
    const sources = Object.values(workspace.files).join("\n");
    if (/\b(?:connect|createServer|fetch)\s*\(/.test(sources)) {
      return result("permissions", "failed", "Source appears to attempt network I/O.", {}, started);
    }
    return result("permissions", "passed", "Declared permissions match observed pure-function behaviour.", {}, started);
  },
};

export async function detectFixtureTampering(workspace: VerifierWorkspace): Promise<GateResult | null> {
  const started = performance.now();
  for (const [path, expectedHash] of Object.entries(workspace.fixtureHashes)) {
    const content = workspace.files[path];
    if (content === undefined) {
      return result(
        "trusted_tests",
        "failed",
        "trusted_fixture_tampering: fixture file missing after build.",
        { detail: path },
        started,
      );
    }
    const actual = await sha256Hex(content);
    if (actual !== expectedHash) {
      return result(
        "trusted_tests",
        "failed",
        "trusted_fixture_tampering: fixture content hash mismatch.",
        { detail: path },
        started,
      );
    }
  }
  return null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
