import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const entrypoint = process.argv[2] ?? "/job/dist/index.js";
const inputPath = process.argv[3] ?? "/job/input.json";

for (const key of Object.keys(process.env)) {
  delete process.env[key];
}

globalThis.fetch = undefined;

const input = JSON.parse(await readFile(inputPath, "utf8"));
const capabilityModule = await import(pathToFileURL(entrypoint).href);
const capability = capabilityModule.default ?? capabilityModule;
if (typeof capability.execute !== "function") {
  throw new TypeError("Capability default export must provide execute(input, context).");
}

const controller = new AbortController();
const context = Object.freeze({
  evidence: Object.freeze(input.evidence ?? []),
  signal: controller.signal,
  now: () => Number(input.now ?? 0),
  log: (level, message) => {
    process.stderr.write(`${JSON.stringify({ level, message: String(message).slice(0, 1000) })}\n`);
  },
});

const result = await capability.execute(input.value, context);
process.stdout.write(`${JSON.stringify(result)}\n`);
