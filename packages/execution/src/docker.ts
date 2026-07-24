import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative, resolve } from "node:path";
import type { ExecResult, ExecSpec, ExecutionBackend } from "@forge/contracts";
import { assertCredentialFreeEnvironment } from "./security";

const OUTPUT_LIMIT_BYTES = 2_000_000;

function safeJobPath(root: string, candidate: string): string {
  const normalized = normalize(candidate).replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
    throw new Error(`Unsafe sandbox path: ${candidate}`);
  }
  const target = resolve(root, normalized);
  if (relative(root, target).startsWith("..")) {
    throw new Error(`Sandbox path escapes job root: ${candidate}`);
  }
  return target;
}

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
    "64",
    "--memory",
    `${spec.memoryMb}m`,
    "--cpus",
    String(spec.cpus),
    "--user",
    "10001:10001",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--volume",
    `${jobDirectory}:/job:rw`,
    "--workdir",
    "/job",
    ...environmentArguments,
    spec.image,
    ...spec.command,
  ];
}

export class DockerExecutionBackend implements ExecutionBackend {
  readonly name = "docker" as const;

  async run(spec: ExecSpec, onOutput?: (chunk: string) => void): Promise<ExecResult> {
    const started = performance.now();
    const jobDirectory = await mkdtemp(join(tmpdir(), "forge-sandbox-"));
    const containerName = `forge-sandbox-${crypto.randomUUID()}`;
    let timedOut = false;

    try {
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
      clearTimeout(timeout);

      if (timedOut) {
        const cleanup = spawn("docker", ["rm", "-f", containerName], { windowsHide: true });
        cleanup.unref();
      }

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
      await rm(jobDirectory, { recursive: true, force: true });
    }
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
