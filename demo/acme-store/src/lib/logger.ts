import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type LogFields = Record<string, unknown>;

function writeLine(level: string, event: string, fields: LogFields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(line);
  }

  try {
    const logPath = join(process.cwd(), "logs", "checkout-errors.ndjson");
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${line}\n`, "utf8");
  } catch {
    // Logging must never break checkout handling.
  }
}

export const logger = {
  error(fields: LogFields, event: string) {
    writeLine("error", event, fields);
  },
};
