/**
 * Server-only transcript loader. Touches the filesystem.
 * Import via `@forge/demo/server` — never from client components.
 */
import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GOLDEN_PATH_TRANSCRIPT_ID,
  parseTranscriptJsonl,
  type LoadedTranscript,
  type ReplayStartResult,
} from "./replay-types";

/**
 * Resolve golden-path.jsonl across package tests, monorepo root, and Next cwd (apps/web).
 */
export function defaultTranscriptPath(metaUrl: string = import.meta.url): string {
  const here = dirname(fileURLToPath(metaUrl));
  const candidates = [
    join(here, "..", "transcripts", "golden-path.jsonl"),
    join(process.cwd(), "transcripts", "golden-path.jsonl"),
    join(process.cwd(), "packages", "demo", "transcripts", "golden-path.jsonl"),
    join(process.cwd(), "..", "..", "packages", "demo", "transcripts", "golden-path.jsonl"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  const fallback = candidates[0];
  if (!fallback) {
    throw new Error("Unable to resolve golden-path transcript path");
  }
  return fallback;
}

export function loadGoldenPathTranscript(path: string = defaultTranscriptPath()): LoadedTranscript {
  const content = readFileSync(path, "utf8");
  const events = parseTranscriptJsonl(content);
  return {
    id: GOLDEN_PATH_TRANSCRIPT_ID,
    path,
    events,
    eventCount: events.length,
  };
}

/**
 * Load and validate the golden-path transcript. Emission through the live
 * event pipeline is left to the API/worker layer (Gate 2).
 */
export function startReplayFromTranscript(
  path: string = defaultTranscriptPath(),
  startedAt: string = new Date().toISOString(),
): ReplayStartResult {
  const loaded = loadGoldenPathTranscript(path);
  return {
    ok: true,
    transcriptId: loaded.id,
    eventCount: loaded.eventCount,
    startedAt,
    events: loaded.events,
  };
}

export {
  GOLDEN_PATH_TRANSCRIPT_ID,
  parseTranscriptJsonl,
  parseTranscriptLine,
  type LoadedTranscript,
  type ReplayStartResult,
  type TranscriptEvent,
} from "./replay-types";
