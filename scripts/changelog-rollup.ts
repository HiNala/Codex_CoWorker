import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve("docs/changelog/tracks");
const output = resolve("docs/changelog/_ROLLUP.md");
const files = (await readdir(directory)).filter((file) => file.endsWith(".md")).sort();
const sections = await Promise.all(files.map((file) => readFile(resolve(directory, file), "utf8")));
await writeFile(output, `# FORGE changelog rollup\n\n${sections.join("\n")}`, "utf8");
console.log(`Rolled up ${files.length} track changelog(s).`);
