import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative, resolve } from "node:path";
import type { ExecResult, ExecSpec, ExecutionBackend } from "@forge/contracts";
import { composeCleanup, withCleanup } from "./lifecycle";
import { assertCredentialFreeEnvironment } from "./security";

/** Matches Track B sandbox table: PIDs 128, output 2 MB. */
const PIDS_LIMIT = 128;
const OUTPUT_LIMIT_BYTES = 2_000_000;
const TMPFS_TMP = "/tmp:rw,noexec,nosuid,size=64m";

function safeJobPath(root: string, candidate: string): string {
  const normalized = normalize(candidate).replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
    throw new Error(`Unsafe sandbox path: ${candidate}`);
  }
  const target = resolve(root, normalized);
  const rel = relative(root, target);
  if (rel.startsWith("..") || rel === "") {
    throw new Error(`Sandbox path escapes job root: ${candidate}`);
  }
  return target;
}

/**
 * Build `docker run` argv for an isolated sandbox.
 *
 * Hardening (always applied — not optional):
 * - --network none
 * - --read-only
 * - --cap-drop ALL
 * - --security-opt no-new-privileges
 * - --memory / --cpus / --pids-limit 128
 * - --user 10001:10001
 * - credential-free env (assertCredentialFreeEnvironment)
 *
 * Spec.network is ignored: Docker local isolation is always network-none.
 * Railway uses network "isolated" at the VM layer.
 */
export function dockerRunArguments(
  spec: ExecSpec,
  containerName: string,
  jobDirectory: string,
): string[] {
  assertCredentialFreeEnvironment(spec.env);
  const environmentArguments = Object.entries(spec.env).flatMap(([key, value]) => [
    "--env",
    `${key}=${value}`,
  ]);

  const memoryMb = Math.max(1, Math.floor(spec.memoryMb));
  const cpus = Math.max(0.1, spec.cpus);

  return [
    "run",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    String(PIDS_LIMIT),
    "--memory",
    `${memoryMb}m`,
    "--cpus",
    String(cpus),
    "--user",
    "10001:10001",
    "--tmpfs",
    TMPFS_TMP,
    "--volume",
    `${jobDirectory}:/job:rw`,
    "--workdir",
    "/job",
    ...environmentArguments,
    spec.image,
    ...spec.command,
  ];
}

function forceRemoveContainer(containerName: string): Promise<void> {
  return new Promise((resolveRemove) => {
    const child = spawn("docker", ["rm", "-f", containerName], { windowsHide: true });
    child.once("error", () => resolveRemove());
    child.once("close", () => resolveRemove());
  });
}

export class DockerExecutionBackend implements ExecutionBackend {
  readonly name = "docker" as const;

  async run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult> {
    assertCredentialFreeEnvironment(spec.env);

    const started = performance.now();
    const jobDirectory = await mkdtemp(join(tmpdir(), "forge-sandbox-"));
    const containerName = `forge-sandbox-${crypto.randomUUID()}`;
    let timedOut = false;

    // Leak prevention: container + temp dir always cleaned in finally (lifecycle.ts).
    return withCleanup(
      composeCleanup(
        () => rm(jobDirectory, { recursive: true, force: true }),
        () => forceRemoveContainer(containerName),
      ),
      async () => {
        for (const [path, contents] of Object.entries(spec.files)) {
          const target = safeJobPath(jobDirectory, path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, contents, "utf8");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, spec.timeoutMs);

        try {
          const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
            (resolveResult, reject) => {
              const child = spawn("docker", dockerRunArguments(spec, containerName, jobDirectory), {
                windowsHide: true,
                signal: controller.signal,
              });
              const stdout: Buffer[] = [];
              const stderr: Buffer[] = [];
              let outputBytes = 0;

              const collect = (target: Buffer[], chunk: Buffer) => {
                const remaining = Math.max(0, OUTPUT_LIMIT_BYTES - outputBytes);
                if (remaining === 0) return;
                const accepted = chunk.subarray(0, remaining);
                outputBytes += accepted.byteLength;
                target.push(accepted);
                onOutput?.(accepted.toString("utf8"));
              };

              child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
              child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
              child.once("error", (error) => {
                if (timedOut && error.name === "AbortError") {
                  resolveResult({
                    exitCode: 124,
                    stdout: Buffer.concat(stdout).toString("utf8"),
                    stderr: Buffer.concat(stderr).toString("utf8"),
                  });
                  return;
                }
                reject(error);
              });
              child.once("close", (code) => {
                resolveResult({
                  exitCode: code ?? (timedOut ? 124 : 1),
                  stdout: Buffer.concat(stdout).toString("utf8"),
                  stderr: Buffer.concat(stderr).toString("utf8"),
                });
              });
            },
          );

          const files: Record<string, string> = {};
          for (const path of Object.keys(spec.files)) {
            try {
              files[path] = await readFile(safeJobPath(jobDirectory, path), "utf8");
            } catch {
              // A capability may deliberately remove an input file.
            }
          }

          return {
            ...result,
            timedOut,
            durationMs: Math.round(performance.now() - started),
            files,
          };
        } finally {
          clearTimeout(timeout);
        }
      },
    );
  }

  async healthy(): Promise<boolean> {
    return new Promise((resolveHealth) => {
      const child = spawn("docker", ["info", "--format", "{{.ServerVersion}}"], {
        windowsHide: true,
      });
      child.once("error", () => resolveHealth(false));
      child.once("close", (code) => resolveHealth(code === 0));
    });
  }
}
