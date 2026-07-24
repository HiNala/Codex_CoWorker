const secretKeyPattern =
  /(authorization|cookie|password|secret|token|api[-_]?key|access[-_]?key|session)/i;
const secretValuePatterns = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bBearer\s+[a-zA-Z0-9._-]+\b/gi,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/g,
] as const;

export function redact(value: unknown, key = ""): unknown {
  if (secretKeyPattern.test(key)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return secretValuePatterns.reduce(
      (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
      value,
    );
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redact(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

export function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {},
): void {
  const safeContext = redact(context);
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(safeContext as Record<string, unknown>),
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}
