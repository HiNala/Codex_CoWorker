import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const track = process.env.FORGE_TRACK;
const [status, ...messageParts] = process.argv.slice(2);
const allowed = new Set(["claimed", "shipped", "blocked", "announce", "request", "handoff"]);

if (!track || !allowed.has(status ?? "") || messageParts.length === 0) {
  console.error(
    "Usage: FORGE_TRACK=<IGNITION|A-L> pnpm log <claimed|shipped|blocked|announce|request|handoff> <message>",
  );
  process.exitCode = 1;
} else {
  const directory = resolve("docs/changelog/tracks");
  await mkdir(directory, { recursive: true });
  const entry = `\n### [${new Date().toISOString()}] ${track} · ${status} · ${messageParts.join(" ")}\n`;
  await appendFile(resolve(directory, `${track}.md`), entry, "utf8");
  console.log(entry.trim());
}
