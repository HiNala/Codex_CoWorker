import type { ArtifactType } from "@forge/contracts";
import { ArtifactSecretDetectedError, ArtifactValidationError } from "../errors";
import type { ContentFormat } from "../types";

/** Basic secret patterns rejected before storage. */
const SECRET_PATTERNS: readonly RegExp[] = [/sk-/, /OPENAI_API_KEY=/, /AKIA/];

export function scanSecrets(content: string): void {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      throw new ArtifactSecretDetectedError(
        `Content rejected by secret scan (matched ${pattern.source})`,
      );
    }
  }
}

export function defaultContentFormat(type: ArtifactType): ContentFormat {
  switch (type) {
    case "document.markdown":
      return "markdown";
    case "code.change":
      return "diff";
    case "table.typed":
    case "capability.package":
    case "receipt.assignment":
      return "json";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function validateContentForType(
  type: ArtifactType,
  content: string,
  contentFormat: ContentFormat,
): void {
  if (content.length === 0) {
    throw new ArtifactValidationError("Artifact content must not be empty");
  }

  switch (type) {
    case "document.markdown":
      if (contentFormat !== "markdown") {
        throw new ArtifactValidationError("document.markdown requires contentFormat markdown");
      }
      return;

    case "table.typed": {
      if (contentFormat !== "json") {
        throw new ArtifactValidationError("table.typed requires contentFormat json");
      }
      const parsed = parseJsonObject(content, "table.typed");
      if (!Array.isArray(parsed["columns"]) || !Array.isArray(parsed["rows"])) {
        throw new ArtifactValidationError(
          "table.typed content must be JSON { columns: [], rows: [] }",
        );
      }
      return;
    }

    case "code.change": {
      if (contentFormat === "diff") {
        return;
      }
      if (contentFormat === "json") {
        parseJsonObject(content, "code.change");
        return;
      }
      throw new ArtifactValidationError("code.change requires contentFormat diff or json");
    }

    case "capability.package":
    case "receipt.assignment": {
      if (contentFormat !== "json") {
        throw new ArtifactValidationError(`${type} requires contentFormat json`);
      }
      parseJsonObject(content, type);
      return;
    }

    default: {
      const _exhaustive: never = type;
      throw new ArtifactValidationError(`Unknown artifact type: ${String(_exhaustive)}`);
    }
  }
}

function parseJsonObject(content: string, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch {
    throw new ArtifactValidationError(`${label} content must be valid JSON`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ArtifactValidationError(`${label} content must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "artifact";
}

/** Multiset line diff — enough for a version compare summary. */
export function lineDiffSummary(
  a: string,
  b: string,
): { contentEqual: boolean; changed: boolean; addedLines: number; removedLines: number } {
  if (a === b) {
    return { contentEqual: true, changed: false, addedLines: 0, removedLines: 0 };
  }

  const countLines = (text: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (const line of text.split("\n")) {
      map.set(line, (map.get(line) ?? 0) + 1);
    }
    return map;
  };

  const ca = countLines(a);
  const cb = countLines(b);
  let addedLines = 0;
  let removedLines = 0;

  for (const [line, count] of cb) {
    const inA = ca.get(line) ?? 0;
    if (count > inA) addedLines += count - inA;
  }
  for (const [line, count] of ca) {
    const inB = cb.get(line) ?? 0;
    if (count > inB) removedLines += count - inB;
  }

  return { contentEqual: false, changed: true, addedLines, removedLines };
}
