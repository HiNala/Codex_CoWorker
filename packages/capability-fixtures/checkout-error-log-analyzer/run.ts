import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_WINDOW, loadCheckoutErrorNdjsonLines } from "./load-demo-lines";
import type { CheckoutErrorLogCase } from "./types";

const here = dirname(fileURLToPath(import.meta.url));

export function loadCaseFiles(): Array<{ name: string; fixture: CheckoutErrorLogCase }> {
  const dir = join(here, "cases");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const demoLines = loadCheckoutErrorNdjsonLines();

  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as CheckoutErrorLogCase & {
      _linesSource?: string;
    };
    // Case 001 embeds empty lines[] + _linesSource — inject demo ndjson at load.
    if (raw._linesSource || (file.startsWith("001") && raw.input.lines.length === 0)) {
      raw.input = {
        lines: demoLines,
        window: raw.input.window ?? { ...DEMO_WINDOW },
      };
    }
    return {
      name: file.replace(/\.json$/, ""),
      fixture: {
        description: raw.description,
        input: raw.input,
        expectedOutput: raw.expectedOutput,
      },
    };
  });
}
