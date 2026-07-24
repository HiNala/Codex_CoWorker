import { DockerExecutionBackend } from "../packages/execution/src/docker";

const backend = new DockerExecutionBackend();
if (!(await backend.healthy())) {
  throw new Error("Docker is not healthy.");
}

const result = await backend.run({
  image: "forge/sandbox-runner:local",
  command: ["/job/dist/index.js", "/job/input.json"],
  files: {
    "dist/index.js": [
      "export default {",
      "  async execute(input, context) {",
      "    return {",
      "      answer: input.left + input.right,",
      "      evidenceCount: context.evidence.length,",
      "      now: context.now(),",
      "      fetchType: typeof globalThis.fetch,",
      "      environmentKeys: Object.keys(process.env),",
      "    };",
      "  },",
      "};",
      "",
    ].join("\n"),
    "input.json": JSON.stringify({
      value: { left: 19, right: 23 },
      evidence: [{ id: "trusted-probe" }],
      now: 1_725_000_000_000,
    }),
  },
  env: { TZ: "UTC" },
  timeoutMs: 10_000,
  memoryMb: 128,
  cpus: 0.5,
  network: "none",
});

if (result.exitCode !== 0 || result.timedOut) {
  throw new Error(`Sandbox failed (${result.exitCode}): ${result.stderr}`);
}

const output = JSON.parse(result.stdout) as {
  answer?: number;
  evidenceCount?: number;
  now?: number;
  fetchType?: string;
  environmentKeys?: string[];
};
if (
  output.answer !== 42 ||
  output.evidenceCount !== 1 ||
  output.now !== 1_725_000_000_000 ||
  output.fetchType !== "undefined" ||
  output.environmentKeys?.length !== 0
) {
  throw new Error(`Sandbox boundary assertion failed: ${result.stdout}`);
}

console.log(
  JSON.stringify({
    status: "ok",
    operation: "isolated-capability-execution",
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    network: "none",
    environmentKeys: output.environmentKeys,
    result: output.answer,
  }),
);
