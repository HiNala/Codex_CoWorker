"use client";

import { PressAndHold } from "@forge/ui";
import type { ApprovalVM, CapabilityTileVM } from "@/hooks/run-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CapabilityInstallApprovalProps {
  approval: ApprovalVM;
  capability?: CapabilityTileVM | null;
  onApprove: () => void;
  onDeny: () => void;
  className?: string;
}

interface ParsedInstallPreview {
  permissions: string[];
  files: { path: string; additions?: number; deletions?: number }[];
  verification: string | null;
  limitations: string | null;
  cost: string | null;
  rollback: string | null;
}

function parseInstallPreview(raw: string): ParsedInstallPreview {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const permissions: string[] = [];
  const files: ParsedInstallPreview["files"] = [];
  let verification: string | null = null;
  let limitations: string | null = null;
  let cost: string | null = null;
  let rollback: string | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("permissions:")) {
      const rest = line.slice("permissions:".length).trim();
      for (const part of rest
        .split(/[·•|,]/)
        .map((p) => p.trim())
        .filter(Boolean)) {
        permissions.push(part);
      }
      continue;
    }
    if (lower.startsWith("files:")) {
      const rest = line.slice("files:".length).trim();
      for (const part of rest
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)) {
        const m = part.match(/^(\S+)\s+\+(\d+)(?:\s+−(\d+)|\s+-(\d+))?$/u);
        if (m?.[1] != null && m[2] != null) {
          files.push({
            path: m[1],
            additions: Number(m[2]),
            deletions: m[3] != null ? Number(m[3]) : m[4] != null ? Number(m[4]) : 0,
          });
        } else {
          files.push({ path: part });
        }
      }
      continue;
    }
    if (lower.startsWith("verification:")) {
      verification = line.slice("verification:".length).trim();
      continue;
    }
    if (lower.startsWith("limitations:")) {
      limitations = line.slice("limitations:".length).trim();
      continue;
    }
    if (lower.startsWith("cost:")) {
      cost = line.slice("cost:".length).trim();
      continue;
    }
    if (lower.startsWith("rollback:")) {
      rollback = line.slice("rollback:".length).trim();
      continue;
    }
  }

  if (permissions.length === 0) {
    permissions.push("No network access", "No filesystem", "No credentials");
  }

  return { permissions, files, verification, limitations, cost, rollback };
}

/**
 * Inline capability install card (never a modal overlay).
 * PressAndHold for pointer; keyboard two-step confirm.
 */
export function CapabilityInstallApproval({
  approval,
  capability,
  onApprove,
  onDeny,
  className,
}: CapabilityInstallApprovalProps) {
  const parsed = parseInstallPreview(approval.payloadPreview);
  const slug = capability?.slug ?? capability?.name ?? "capability";
  const version = capability?.version;

  return (
    <div
      role="region"
      aria-labelledby="capability-install-title"
      className={cn(
        "flex min-h-0 w-full flex-col rounded-xl border border-border bg-[color:var(--ops-raised)] p-4",
        className,
      )}
      data-approval-id={approval.id}
      data-approval-risk={approval.risk}
      data-capability-install
      data-inline-install
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Install a new capability
          </p>
          <h3 id="capability-install-title" className="mt-1 text-base font-semibold tracking-tight">
            {approval.title}
          </h3>
        </div>
        <div className="text-end font-mono text-[11px] text-muted-foreground">
          <p className="truncate max-w-[16rem]">{slug}</p>
          {version ? <p className="tabular-nums">v{version}</p> : null}
        </div>
      </header>

      <div className="mt-4 space-y-5 text-sm">
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            What it does
          </h4>
          <p className="mt-1.5 max-w-[62ch] leading-6 text-foreground/90">{approval.summary}</p>
        </section>

        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Permissions
          </h4>
          <ul className="mt-2 space-y-1.5" data-permissions>
            {parsed.permissions.map((perm) => (
              <li
                key={perm}
                className="flex items-start gap-2 text-sm text-[color:var(--status-success)]"
              >
                <span aria-hidden className="mt-0.5 font-mono text-xs">
                  ✓
                </span>
                <span className="text-foreground/90">{formatPermission(perm)}</span>
              </li>
            ))}
          </ul>
        </section>

        {parsed.files.length > 0 ? (
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Changes
            </h4>
            <ul className="mt-2 space-y-1 font-mono text-xs tabular-nums" data-file-changes>
              {parsed.files.map((f) => (
                <li key={f.path} className="grid grid-cols-[1fr_auto] gap-3 text-muted-foreground">
                  <span className="truncate text-foreground/80">{f.path}</span>
                  <span>
                    {f.additions != null ? (
                      <span className="text-[color:var(--status-success)]">+{f.additions}</span>
                    ) : null}
                    {f.deletions != null && f.deletions > 0 ? (
                      <span className="ml-2 text-[color:var(--status-danger)]">−{f.deletions}</span>
                    ) : f.additions != null ? (
                      <span className="ml-2 text-muted-foreground">−0</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2">
          {parsed.verification ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Verification
              </dt>
              <dd className="mt-1 text-sm leading-5">{parsed.verification}</dd>
            </div>
          ) : null}
          {parsed.limitations ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Limitations
              </dt>
              <dd className="mt-1 text-sm leading-5">{parsed.limitations}</dd>
            </div>
          ) : null}
          {parsed.cost ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Cost
              </dt>
              <dd className="mt-1 font-mono text-sm tabular-nums">{parsed.cost}</dd>
            </div>
          ) : null}
          {parsed.rollback ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Rollback
              </dt>
              <dd className="mt-1 text-sm leading-5">{parsed.rollback}</dd>
            </div>
          ) : (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Rollback
              </dt>
              <dd className="mt-1 text-sm leading-5 text-muted-foreground">
                Disable at any time; existing receipts stay resolvable.
              </dd>
            </div>
          )}
        </dl>

        {approval.payloadPreview && !parsed.verification && parsed.files.length === 0 ? (
          <pre className="overflow-auto rounded-md border border-border/80 bg-muted/30 p-3 font-mono text-[11px] leading-5 text-muted-foreground whitespace-pre-wrap">
            {approval.payloadPreview}
          </pre>
        ) : null}
      </div>

      <footer className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/80 pt-4">
        <PressAndHold
          onComplete={onApprove}
          label={`Hold to approve install of ${slug}`}
          keyboardConfirmLabel="Press again to confirm install"
          className="min-h-11"
        >
          Hold to approve
        </PressAndHold>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 px-4"
          onClick={onDeny}
          data-approval-deny
        >
          Reject
        </Button>
      </footer>
    </div>
  );
}

function formatPermission(raw: string): string {
  const t = raw.trim();
  if (/^no\s+/i.test(t)) {
    const rest = t.replace(/^no\s+/i, "");
    return `No ${rest}`;
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}
