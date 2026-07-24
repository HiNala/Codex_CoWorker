"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RunEvent } from "@forge/contracts";
import { serializeRunEvent } from "@forge/events";
import { buildDemoEvents } from "./demo-run-fixture";
import { extractSseDataPayload, parseSseRunEventData } from "./parse-sse-run-event";
import { resolveStreamRunId, DEMO_ASSIGNMENT_RUN_MAP } from "./resolve-stream-run-id";
import { runReducer } from "./run-reducer";
import { initialRunState, type RunState } from "./run-state";

export interface UseRunStreamOptions {
  /** Force fixture only (tests). Production: live SSE with not_configured fallback. */
  useDemoFixture?: boolean;
  runId?: string | null;
}

export interface RunStreamControls {
  approve: (approvalId: string) => void;
  deny: (approvalId: string) => void;
  send: (text: string) => void;
  pause: () => void;
}

export interface UseRunStreamResult {
  state: RunState;
  controls: RunStreamControls;
  streamMode: "live" | "fixture" | "connecting";
}

function localId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `0198206f-5f53-7000-8000-${String(Date.now()).slice(-12).padStart(12, "0")}`;
}

/**
 * Live SSE is primary (Cael contract INTERFACES.md).
 * Fixture only on not_configured / disconnected (503 JSON or unreachable).
 */
export function useRunStream(
  assignmentId: string,
  options: UseRunStreamOptions = {},
): UseRunStreamResult {
  const forceDemo = options.useDemoFixture === true;
  const streamRunId = resolveStreamRunId(assignmentId, options.runId);
  const [state, dispatch] = useReducer(runReducer, initialRunState);
  const [streamMode, setStreamMode] = useState<"live" | "fixture" | "connecting">("connecting");
  const lastSeqRef = useRef(0);

  useEffect(() => {
    lastSeqRef.current = state.lastSeq;
  }, [state.lastSeq]);

  const applyEvent = useCallback((event: RunEvent) => {
    dispatch({ type: "event", event });
  }, []);

  const injectLocal = useCallback(
    (
      type: RunEvent["type"],
      summary: string,
      detail: Record<string, unknown> = {},
      refs: RunEvent["refs"] = {},
    ) => {
      const seq = Math.max(1, lastSeqRef.current + 1);
      const channel: RunEvent["channel"] = type.startsWith("approval")
        ? "approval"
        : type.startsWith("user") || type.startsWith("coworker")
          ? "narrative"
          : "system";
      const event: RunEvent = {
        id: localId(),
        seq,
        runId: streamRunId,
        assignmentId: assignmentId || DEMO_ASSIGNMENT_RUN_MAP.activeAssignment,
        orgId: "0198206f-5f53-7000-8000-000000000001",
        ts: new Date().toISOString(),
        type,
        channel,
        level: "info",
        visibility: "user",
        summary: summary.slice(0, 280),
        detail,
        refs,
      };
      applyEvent(event);
    },
    [applyEvent, assignmentId, streamRunId],
  );

  const decide = useCallback(
    async (approvalId: string, decision: "approved" | "denied") => {
      const idempotency =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `decide-${approvalId}-${decision}-${Date.now()}`;
      try {
        const res = await fetch(`/api/approvals/${approvalId}/decide`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": idempotency,
          },
          body: JSON.stringify({
            decision,
            runId: streamRunId,
            assignmentId: assignmentId || DEMO_ASSIGNMENT_RUN_MAP.activeAssignment,
            orgId: "0198206f-5f53-7000-8000-000000000001",
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          events?: RunEvent[];
          code?: string;
          detail?: string;
        };
        if (res.ok && Array.isArray(json.events)) {
          for (const ev of json.events) {
            if (ev && typeof ev.seq === "number") applyEvent(ev);
          }
          // Ensure UI clears even if events[] empty (SSE may follow)
          if (!json.events?.length) {
            injectLocal(
              decision === "approved" ? "approval.granted" : "approval.denied",
              decision === "approved" ? "Approval granted" : "Approval denied",
              {},
              { approvalId },
            );
          }
          return;
        }
        // 503 / offline: still apply local decision so UI does not hang on "Approving…"
        if (res.status === 503 || !res.ok) {
          injectLocal(
            decision === "approved" ? "approval.granted" : "approval.denied",
            decision === "approved"
              ? "Approval recorded (offline / not_configured)"
              : "Denial recorded (offline / not_configured)",
            { code: json.code, detail: json.detail },
            { approvalId },
          );
        }
      } catch {
        injectLocal(
          decision === "approved" ? "approval.granted" : "approval.denied",
          decision === "approved"
            ? "Approval applied locally (network error)"
            : "Denial applied locally (network error)",
          {},
          { approvalId },
        );
      }
    },
    [applyEvent, assignmentId, injectLocal, streamRunId],
  );

  const controls: RunStreamControls = {
    approve: (approvalId) => {
      void decide(approvalId, "approved");
    },
    deny: (approvalId) => {
      void decide(approvalId, "denied");
    },
    send: (text) => {
      const t = text.trim();
      if (!t) return;
      injectLocal("user.message", t.slice(0, 280), { text: t });
    },
    pause: () => {
      injectLocal("run.paused", "Run paused");
    },
  };

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    const onFrameData = (data: string) => {
      const event = parseSseRunEventData(data);
      if (event) applyEvent(event);
    };

    const useFixture = () => {
      if (cancelled) return;
      setStreamMode("fixture");
      dispatch({ type: "reset" });
      dispatch({ type: "connected" });
      ingestDemoAsSseFrames(onFrameData);
    };

    const openLive = async () => {
      if (forceDemo) {
        useFixture();
        return;
      }

      // Best-effort Broken Checkout seed before deep-link stream
      try {
        await fetch("/api/demo/seed", { method: "POST", credentials: "same-origin" });
      } catch {
        /* optional */
      }

      // Probe for 503 not_configured (EventSource hides status codes)
      try {
        const ac = new AbortController();
        const t = globalThis.setTimeout(() => ac.abort(), 4000);
        const probe = await fetch(`/api/runs/${streamRunId}/stream?after=0`, {
          method: "GET",
          headers: { Accept: "text/event-stream" },
          signal: ac.signal,
        });
        globalThis.clearTimeout(t);

        const ct = probe.headers.get("content-type") ?? "";
        if (probe.status === 503 || !ct.includes("text/event-stream")) {
          try {
            const body = (await probe.json()) as { status?: string };
            if (
              body.status === "not_configured" ||
              probe.status === 503 ||
              !ct.includes("text/event-stream")
            ) {
              useFixture();
              return;
            }
          } catch {
            useFixture();
            return;
          }
        }
        if (probe.body) {
          try {
            await probe.body.cancel();
          } catch {
            /* ignore */
          }
        }
        if (!probe.ok) {
          useFixture();
          return;
        }
      } catch {
        useFixture();
        return;
      }

      if (cancelled) return;

      setStreamMode("live");
      const after = lastSeqRef.current;
      es = new EventSource(`/api/runs/${streamRunId}/stream?after=${after}`);

      es.addEventListener("run.event", (e) => {
        const me = e as MessageEvent;
        if (typeof me.data === "string") onFrameData(me.data);
      });
      es.addEventListener("heartbeat", () => {
        /* do not advance cursor */
      });
      es.onopen = () => dispatch({ type: "connected" });
      es.onerror = () => {
        dispatch({ type: "disconnected" });
      };
    };

    void openLive();

    return () => {
      cancelled = true;
      if (es) es.close();
    };
  }, [streamRunId, forceDemo, applyEvent]);

  return { state, controls, streamMode };
}

function ingestDemoAsSseFrames(onFrameData: (data: string) => void): void {
  const decoder = new TextDecoder();
  for (const event of buildDemoEvents()) {
    const frame = decoder.decode(serializeRunEvent(event));
    const data = extractSseDataPayload(frame);
    if (data) onFrameData(data);
  }
}

export { runReducer } from "./run-reducer";
export { buildDemoRunState, buildDemoEvents } from "./demo-run-fixture";
export { resolveStreamRunId } from "./resolve-stream-run-id";
export type { RunState } from "./run-state";
