import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ignored = new Set(["node_modules", ".next", "dist", "drizzle", "coverage", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".md"]);
const oversized: Array<{ file: string; lines: number }> = [];

async function walk(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!extensions.has(extname(entry.name))) continue;
    const size = await stat(path);
    if (size.size === 0) continue;
    const contents = await import("node:fs/promises").then((fs) => fs.readFile(path, "utf8"));
    const lines = contents.split(/\r?\n/).length;
    if (lines > 500) oversized.push({ file: relative(process.cwd(), path), lines });
  }
}

await walk(process.cwd());
oversized.sort((left, right) => right.lines - left.lines);
for (const entry of oversized) console.log(`${entry.lines}\t${entry.file}`);
if (oversized.length === 0) console.log("No hand-written file exceeds 500 lines.");
