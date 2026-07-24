"use client";

import * as React from "react";
import { CapabilityTile, type CapabilityState, useReducedMotion } from "@forge/ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Lightweight scripted product preview for the marketing hero.
 * ~8s lifecycle + 2s hold, then loop. Pauses offscreen and in hidden tabs.
 * prefers-reduced-motion → final frame static.
 */

type CapId = "zendesk" | "github" | "log-analysis" | "pr-writer";

interface CapFrame {
  id: CapId;
  name: string;
  kind: "connection" | "skill" | "workflow";
  state: CapabilityState;
  progress?: { passed: number; total: number };
  version?: string;
}

interface PreviewFrame {
  t: number;
  phase: string;
  contractVisible: boolean;
  contractTitle: string;
  capabilities: CapFrame[];
  artifact: {
    visible: boolean;
    ready: boolean;
    title: string;
    metric: string;
  };
}

const BASE_CAPS: CapFrame[] = [
  {
    id: "zendesk",
    name: "Zendesk read",
    kind: "connection",
    state: "available",
  },
  {
    id: "github",
    name: "GitHub PR",
    kind: "connection",
    state: "available",
  },
  {
    id: "log-analysis",
    name: "Log analysis",
    kind: "skill",
    state: "missing",
  },
  {
    id: "pr-writer",
    name: "PR authoring",
    kind: "workflow",
    state: "available",
  },
];

function withCap(id: CapId, patch: Partial<CapFrame>, caps = BASE_CAPS): CapFrame[] {
  return caps.map((c) => (c.id === id ? { ...c, ...patch } : { ...c }));
}

function activateExisting(caps: CapFrame[]): CapFrame[] {
  return caps.map((c) => (c.id === "log-analysis" ? c : { ...c, state: "active" as const }));
}

/** Keyframes across 0–8000ms. Final hold 8000–10000. */
const FRAMES: PreviewFrame[] = [
  {
    t: 0,
    phase: "Waiting for work",
    contractVisible: false,
    contractTitle: "",
    capabilities: BASE_CAPS,
    artifact: { visible: false, ready: false, title: "", metric: "" },
  },
  {
    t: 600,
    phase: "Task arrives",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: BASE_CAPS,
    artifact: { visible: false, ready: false, title: "", metric: "" },
  },
  {
    t: 1600,
    phase: "Existing tools activate",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: activateExisting(BASE_CAPS),
    artifact: {
      visible: true,
      ready: false,
      title: "Diagnosis note",
      metric: "Declared",
    },
  },
  {
    t: 2600,
    phase: "Missing capability specified",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap("log-analysis", { state: "specifying" }, activateExisting(BASE_CAPS)),
    artifact: {
      visible: true,
      ready: false,
      title: "Diagnosis note",
      metric: "Drafting…",
    },
  },
  {
    t: 3400,
    phase: "Codex builds the tool",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap(
      "log-analysis",
      { state: "building", progress: { passed: 3, total: 8 } },
      activateExisting(BASE_CAPS),
    ),
    artifact: {
      visible: true,
      ready: false,
      title: "Diagnosis note",
      metric: "Drafting…",
    },
  },
  {
    t: 4300,
    phase: "Verifying gates",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap(
      "log-analysis",
      { state: "testing", progress: { passed: 7, total: 8 } },
      activateExisting(BASE_CAPS),
    ),
    artifact: {
      visible: true,
      ready: false,
      title: "Impact report",
      metric: "0 rows",
    },
  },
  {
    t: 5200,
    phase: "Gates green",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap(
      "log-analysis",
      { state: "testing", progress: { passed: 8, total: 8 } },
      activateExisting(BASE_CAPS),
    ),
    artifact: {
      visible: true,
      ready: false,
      title: "Impact report",
      metric: "142 rows",
    },
  },
  {
    t: 6000,
    phase: "Tool installed",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap(
      "log-analysis",
      { state: "installed", version: "0.1.0" },
      activateExisting(BASE_CAPS),
    ),
    artifact: {
      visible: true,
      ready: false,
      title: "Impact report",
      metric: "142 affected",
    },
  },
  {
    t: 7000,
    phase: "Work complete",
    contractVisible: true,
    contractTitle: "Fix annual checkout · Zendesk #4821",
    capabilities: withCap(
      "log-analysis",
      { state: "active", version: "0.1.0" },
      activateExisting(BASE_CAPS),
    ),
    artifact: {
      visible: true,
      ready: true,
      title: "Pull request + owner brief",
      metric: "Ready · 3 artifacts",
    },
  },
];

const LOOP_MS = 10_000;
const FINAL_FRAME = FRAMES[FRAMES.length - 1]!;

function frameAt(elapsed: number): PreviewFrame {
  const t = elapsed % LOOP_MS;
  // Hold final composition from 8s–10s
  if (t >= 8_000) return FINAL_FRAME;
  let current = FRAMES[0]!;
  for (const f of FRAMES) {
    if (f.t <= t) current = f;
    else break;
  }
  return current;
}

export function HeroPreview({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  /** Stay on final frame until client mount (hydration-safe; no sync setState-in-effect). */
  const [motionReady, setMotionReady] = React.useState(false);

  React.useEffect(() => {
    if (reduceMotion) return;
    queueMicrotask(() => setMotionReady(true));
  }, [reduceMotion]);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), {
      threshold: 0.12,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    queueMicrotask(onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  React.useEffect(() => {
    if (reduceMotion || !motionReady || !visible || hidden) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsed((e) => e + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion, motionReady, visible, hidden]);

  const frame = reduceMotion || !motionReady ? FINAL_FRAME : frameAt(elapsed);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-[min(520px,70dvh)] w-full min-h-[420px] overflow-hidden rounded-xl border border-white/12 bg-black/35 shadow-lift backdrop-blur-sm",
        className,
      )}
      aria-label="Product preview: a coworker builds a missing capability and finishes the job"
    >
      {/* Reserved chrome — zero CLS */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            Live preview
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-white/90" aria-live="polite">
            {frame.phase}
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-white/15 bg-white/5 text-[10px] text-white/70"
        >
          Scripted · not live data
        </Badge>
      </div>

      <div className="grid h-[calc(100%-3.25rem)] gap-3 p-3 sm:grid-cols-[0.9fr_1.1fr] sm:gap-4 sm:p-4">
        <div className="flex min-h-0 flex-col gap-3">
          <ContractCard visible={frame.contractVisible} title={frame.contractTitle} />
          <ArtifactPreview
            visible={frame.artifact.visible}
            ready={frame.artifact.ready}
            title={frame.artifact.title}
            metric={frame.artifact.metric}
          />
        </div>

        <div className="grid min-h-0 grid-cols-2 content-start gap-2 sm:gap-2.5">
          {frame.capabilities.map((cap) => (
            <CapabilityTile
              key={cap.id}
              id={`hero-${cap.id}`}
              name={cap.name}
              kind={cap.kind}
              state={cap.state}
              progress={cap.progress}
              version={cap.version}
              className="bg-card/90"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContractCard({ visible, title }: { visible: boolean; title: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-3.5 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-40",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-status-testing">
        Assignment contract
      </p>
      <p className="mt-2 min-h-[2.5rem] text-sm font-medium leading-5 text-white/90">
        {visible && title ? title : "Waiting for a job…"}
      </p>
      {visible ? (
        <ul className="mt-3 space-y-1 text-[11px] text-white/55">
          <li>· Diagnose annual plan checkout</li>
          <li>· Measure who else is affected</li>
          <li>· Open PR + brief the owner</li>
        </ul>
      ) : null}
    </div>
  );
}

function ArtifactPreview({
  visible,
  ready,
  title,
  metric,
}: {
  visible: boolean;
  ready: boolean;
  title: string;
  metric: string;
}) {
  if (!visible) {
    return (
      <div
        className="flex min-h-[5.5rem] flex-1 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-white/35"
        aria-hidden
      >
        Artifacts appear when declared
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 transition-[border-color,background-color] duration-300",
        ready
          ? "border-solid border-status-success/50 bg-status-success/10"
          : "border-dashed border-white/15 bg-white/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Artifact
          </p>
          <p className="mt-1.5 text-sm font-medium text-white/90">{title}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            ready ? "bg-status-success/20 text-status-success" : "bg-white/5 text-white/55",
          )}
        >
          {ready ? "Ready" : "Declared"}
        </span>
      </div>
      <p className="mt-3 font-mono text-xs tabular-nums text-white/60">{metric}</p>
    </div>
  );
}
