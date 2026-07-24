"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearDemoAccessCode,
  demoAccessHeaders,
  readDemoAccessCode,
  writeDemoAccessCode,
} from "@/components/presenter/demo-access";
import {
  applyPresenterDom,
  readPresenterMode,
  writePresenterMode,
} from "@/components/presenter/presenter-mode";

type AdapterMap = {
  openai: string;
  codex: string;
  octen: string;
  composio: string;
  zendesk: string;
  sandbox: string;
};

type StatusPayload = {
  ok: boolean;
  adapters: AdapterMap;
  panicActive: boolean;
  panicAt: string | null;
  seed: {
    seeded: boolean;
    capabilities: number;
    activeRuns: number;
    lastResetAt: string | null;
    lastResetDurationMs: number | null;
    assignmentId: string | null;
    coworkerId: string | null;
    orgId: string | null;
    expectedCapabilities?: number;
    missingLiveBuild?: string;
    defaultIds?: { assignmentId: string; coworkerId: string; orgId: string };
  };
  replay: {
    active: boolean;
    transcriptId: string | null;
    eventCount: number;
    error: string | null;
  };
  scenarios: Array<{
    id: string;
    label: string;
    estimateLabel: string;
    entryPoint: string;
  }>;
  note?: string;
};

type HealthStrip = {
  db: "up" | "down" | "unknown";
  storage: "up" | "down" | "unknown";
  queue: number | null;
  providers: Record<string, string>;
};

const ADAPTER_OPTIONS_LIVE = ["fake", "live"] as const;
const SANDBOX_OPTIONS = ["fake", "docker", "railway"] as const;

async function demoFetch(path: string, code: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const access = demoAccessHeaders(code);
  for (const [key, value] of Object.entries(access)) {
    headers.set(key, value);
  }
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(path, { ...init, headers });
}

function statusDot(ok: boolean | "unknown") {
  if (ok === "unknown") return "bg-muted-foreground/50";
  return ok ? "bg-status-success" : "bg-destructive";
}

export function DemoControlPanel() {
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [health, setHealth] = useState<HealthStrip>({
    db: "unknown",
    storage: "unknown",
    queue: null,
    providers: {},
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [presenter, setPresenter] = useState(false);
  const [localAdapters, setLocalAdapters] = useState<AdapterMap | null>(null);

  const unlock = useCallback(async (value: string) => {
    setAuthError(null);
    setBusy("auth");
    try {
      const res = await demoFetch("/api/demo/status", value);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setAuthError(body?.message ?? "Access denied");
        clearDemoAccessCode();
        setCode(null);
        setStatus(null);
        return;
      }
      const payload = (await res.json()) as StatusPayload;
      writeDemoAccessCode(value);
      setCode(value);
      setStatus(payload);
      setLocalAdapters(payload.adapters);
      setMessage(null);
    } catch {
      setAuthError("Could not reach demo status endpoint");
    } finally {
      setBusy(null);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!code) return;
    const res = await demoFetch("/api/demo/status", code);
    if (!res.ok) {
      if (res.status === 401) {
        clearDemoAccessCode();
        setCode(null);
        setStatus(null);
        setAuthError("Session expired — re-enter access code");
      }
      return;
    }
    const payload = (await res.json()) as StatusPayload;
    setStatus(payload);
    setLocalAdapters(payload.adapters);
  }, [code]);

  const refreshHealth = useCallback(async () => {
    try {
      const [readyRes, statusRes] = await Promise.all([
        fetch("/api/health/ready"),
        fetch("/api/health/status"),
      ]);
      const ready = readyRes.ok
        ? ((await readyRes.json()) as {
            checks?: { database?: { status: string }; storage?: { status: string } };
            queueDepth?: number | null;
          })
        : null;
      const providers = statusRes.ok
        ? ((await statusRes.json()) as { providers?: Record<string, string> })
        : null;
      setHealth({
        db: ready?.checks?.database?.status === "up" ? "up" : ready ? "down" : "unknown",
        storage: ready?.checks?.storage?.status === "up" ? "up" : ready ? "down" : "unknown",
        queue: ready?.queueDepth ?? null,
        providers: providers?.providers ?? {},
      });
    } catch {
      setHealth((prev) => ({ ...prev, db: "unknown", storage: "unknown" }));
    }
  }, []);

  useEffect(() => {
    const existing = readDemoAccessCode();
    const presenterOn = readPresenterMode();
    setPresenter(presenterOn);
    applyPresenterDom(presenterOn);
    if (existing) {
      void unlock(existing);
    }
    void refreshHealth();
  }, [unlock, refreshHealth]);

  const assignmentHref = useMemo(() => {
    const id =
      status?.seed.assignmentId ??
      status?.seed.defaultIds?.assignmentId ??
      "0198206f-5f53-7000-8000-000000000005";
    return `/a/${id}`;
  }, [status]);

  async function runAction(name: string, path: string) {
    if (!code) return;
    setBusy(name);
    setMessage(null);
    try {
      const res = await demoFetch(path, code, { method: "POST", body: "{}" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        durationMs?: number;
        eventCount?: number;
        adapters?: AdapterMap;
      };
      if (!res.ok) {
        setMessage(body.message ?? `${name} failed (${res.status})`);
      } else {
        const extra =
          body.durationMs !== undefined
            ? ` (${body.durationMs}ms)`
            : body.eventCount !== undefined
              ? ` · ${body.eventCount} events`
              : "";
        setMessage(`${name} ok${extra}`);
        if (body.adapters) setLocalAdapters(body.adapters);
        await refreshStatus();
        await refreshHealth();
      }
    } catch {
      setMessage(`${name} request failed`);
    } finally {
      setBusy(null);
    }
  }

  function onPresenterToggle() {
    const next = !presenter;
    setPresenter(next);
    writePresenterMode(next);
    applyPresenterDom(next);
  }

  if (!code || !status) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-base tracking-[0.14em]">DEMO CONTROL</CardTitle>
            <CardDescription>
              Enter the demo access code. Stored in sessionStorage for this tab only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              type="password"
              autoComplete="off"
              placeholder="Access code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && codeInput.trim()) {
                  void unlock(codeInput.trim());
                }
              }}
            />
            {authError ? (
              <p className="text-xs text-destructive" role="alert">
                {authError}
              </p>
            ) : null}
            <Button
              disabled={!codeInput.trim() || busy === "auth"}
              onClick={() => void unlock(codeInput.trim())}
            >
              {busy === "auth" ? "Checking…" : "Unlock panel"}
            </Button>
            <p className="text-[0.65rem] text-muted-foreground">
              Hidden from navigation. Mutations refuse production unless DEMO_MODE=1.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const adapters = localAdapters ?? status.adapters;
  const stateLabel = status.seed.seeded
    ? `seeded · ${status.seed.capabilities} capabilities · ${status.seed.activeRuns} active runs`
    : `not seeded · expected ${status.seed.expectedCapabilities ?? 4} capabilities`;

  return (
    <main
      id="main"
      className="mx-auto min-h-dvh max-w-3xl px-5 py-8 data-[presenter=on]:text-[1.05rem]"
      data-presenter={presenter ? "on" : "off"}
    >
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground">
            FORGE
          </p>
          <h1 className="text-lg font-semibold tracking-[0.12em]">DEMO CONTROL</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status.panicActive ? (
            <Badge variant="destructive">PANIC active</Badge>
          ) : (
            <Badge variant="outline">live panel</Badge>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={assignmentHref}>Open cockpit</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearDemoAccessCode();
              setCode(null);
              setStatus(null);
            }}
          >
            Lock
          </Button>
        </div>
      </header>

      {message ? (
        <p className="mb-4 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>State</CardTitle>
            <CardDescription>{stateLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <Button
              disabled={busy !== null}
              onClick={() => void runAction("Reset", "/api/demo/reset")}
            >
              {busy === "Reset" ? "Resetting…" : "Reset to clean state"}
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => void runAction("Seed", "/api/demo/seed")}
            >
              Seed IDs
            </Button>
            {status.seed.lastResetDurationMs != null ? (
              <span className="text-xs text-muted-foreground">
                last reset {status.seed.lastResetDurationMs}ms
              </span>
            ) : null}
            {status.seed.missingLiveBuild ? (
              <span className="text-xs text-muted-foreground">
                not installed: {status.seed.missingLiveBuild}
              </span>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Adapters</CardTitle>
            <CardDescription>
              UI selectors update the local view; PANIC forces all → fake in demo runtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["openai", ADAPTER_OPTIONS_LIVE],
                  ["codex", ADAPTER_OPTIONS_LIVE],
                  ["octen", ADAPTER_OPTIONS_LIVE],
                  ["composio", ADAPTER_OPTIONS_LIVE],
                  ["zendesk", ADAPTER_OPTIONS_LIVE],
                  ["sandbox", SANDBOX_OPTIONS],
                ] as const
              ).map(([key, options]) => (
                <label key={key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium tracking-wide uppercase">{key}</span>
                  <select
                    className="h-7 rounded-md border border-border bg-input/30 px-2"
                    value={adapters[key]}
                    onChange={(event) => {
                      setLocalAdapters((prev) => ({
                        ...(prev ?? adapters),
                        [key]: event.target.value,
                      }));
                    }}
                  >
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <Button
              variant="destructive"
              size="lg"
              className="h-11 w-full text-sm font-semibold tracking-wide"
              disabled={busy !== null}
              onClick={() => void runAction("PANIC", "/api/demo/panic")}
            >
              {busy === "PANIC" ? "Switching…" : "PANIC: all → fake"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>Broken checkout golden path (scenario 23).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-4">
            {(status.scenarios ?? []).map((scenario) => {
              const isReplay = scenario.entryPoint === "replay";
              return (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">{scenario.label}</p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      est. {scenario.estimateLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isReplay ? "secondary" : "outline"}
                    disabled={busy !== null}
                    onClick={() => {
                      if (isReplay) {
                        void runAction("Replay", "/api/demo/replay");
                      } else {
                        void runAction("Reset", "/api/demo/reset").then(() => {
                          window.location.href = assignmentHref;
                        });
                      }
                    }}
                  >
                    ▶ Run
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Presenter</CardTitle>
            <CardDescription>
              Emphasises real state — never hides failures. Persisted in localStorage.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <Button variant={presenter ? "default" : "outline"} onClick={onPresenterToggle}>
              {presenter ? "Exit presenter mode" : "Enter presenter mode"}
            </Button>
            {status.replay.active ? (
              <Badge variant="secondary">
                replay · {status.replay.eventCount} events · {status.replay.transcriptId}
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4 text-xs">
            <HealthChip label="db" ok={health.db === "up"} unknown={health.db === "unknown"} />
            <HealthChip
              label="storage"
              ok={health.storage === "up"}
              unknown={health.storage === "unknown"}
            />
            <span className="text-muted-foreground">
              queue {health.queue == null ? "—" : health.queue}
            </span>
            {Object.entries(health.providers).map(([name, state]) => (
              <span key={name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={`size-1.5 rounded-full ${statusDot(state === "connected" || state === "degraded")}`}
                />
                {name} {state}
              </span>
            ))}
            <Button variant="ghost" size="xs" onClick={() => void refreshHealth()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function HealthChip({
  label,
  ok,
  unknown,
}: {
  label: string;
  ok: boolean;
  unknown?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-1.5 rounded-full ${statusDot(unknown ? "unknown" : ok)}`}
        aria-hidden
      />
      {label} {unknown ? "?" : ok ? "✓" : "✗"}
    </span>
  );
}
