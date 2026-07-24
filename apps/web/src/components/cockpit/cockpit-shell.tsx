"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePanel } from "./workspace-panel";

const events = [
  ["You", "Find out why customers cannot buy the annual plan and prepare a verified fix."],
  ["Nala", "I drafted a bounded contract and reserved the approved work ceiling."],
  ["Trace", "Observed twelve support tickets with the same checkout failure signature."],
] as const;

const steps = [
  ["completed", "Collect support evidence"],
  ["running", "Reproduce annual checkout failure"],
  ["pending", "Measure affected customers"],
  ["pending", "Prepare and verify the fix"],
] as const;

const capabilities = [
  ["installed", "Ticket clusterer"],
  ["active", "Customer impact mapper"],
  ["missing", "Checkout error log analyzer"],
  ["installed", "Repository change proposer"],
] as const;

const artifacts = [
  "Incident report",
  "Affected customers",
  "Code change",
  "Capability",
  "Receipt",
] as const;

function Conversation() {
  return (
    <WorkspacePanel
      title="Conversation"
      description="Narrative, evidence, decisions, and approvals"
      className="h-full"
    >
      <div className="space-y-5 p-5">
        {events.map(([author, body]) => (
          <article key={body} className="max-w-[62ch]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {author}
            </p>
            <p className="mt-2 text-sm leading-6">{body}</p>
          </article>
        ))}
        <div className="rounded-lg border border-dashed border-border bg-muted/35 p-4">
          <p className="text-sm font-medium">The stream rail is ready.</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Track A will attach persisted SSE events here; no timer is driving this shell.
          </p>
        </div>
      </div>
    </WorkspacePanel>
  );
}

function MissionControl() {
  return (
    <WorkspacePanel
      title="Mission control"
      description="Approved milestones and legal step transitions"
      badge={<Badge variant="outline">1 active</Badge>}
      className="h-full"
    >
      <ol className="divide-y divide-border/70">
        {steps.map(([status, title], index) => (
          <li key={title} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-3.5">
            <span className="font-mono text-xs tabular text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">{status}</span>
          </li>
        ))}
      </ol>
    </WorkspacePanel>
  );
}

function Foundry() {
  return (
    <WorkspacePanel title="The foundry" description="Capability gap, build, verify, approve">
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {capabilities.map(([status, name]) => (
          <article key={name} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium">{name}</h3>
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
            <Progress
              value={status === "installed" ? 100 : status === "active" ? 68 : 0}
              className="mt-5 h-1.5"
            />
          </article>
        ))}
      </div>
    </WorkspacePanel>
  );
}

function Outputs() {
  return (
    <section
      aria-label="Artifact dock"
      className="panel-glass border-t border-border px-4 py-3 sm:px-5"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {artifacts.map((artifact) => (
          <button
            key={artifact}
            type="button"
            className="min-h-11 shrink-0 rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            {artifact}
          </button>
        ))}
      </div>
    </section>
  );
}

export function CockpitShell({ assignmentId }: { assignmentId: string }) {
  return (
    <main id="main" className="min-h-dvh">
      <div className="cockpit-grid cockpit-desktop">
        <header className="cockpit-bar panel-glass flex items-center justify-between border-b border-border px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Annual checkout recovery</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{assignmentId}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <p className="font-mono text-xs tabular">0.00 / 5.00 credits</p>
              <p className="text-[11px] text-muted-foreground">Reserved ceiling</p>
            </div>
            <Button variant="outline" size="sm" disabled title="Run controls attach in Track A">
              Pause
            </Button>
          </div>
        </header>
        <div className="cockpit-conversation border-r border-border">
          <Conversation />
        </div>
        <div className="cockpit-right">
          <MissionControl />
          <Foundry />
        </div>
        <div className="cockpit-dock">
          <Outputs />
        </div>
      </div>

      <div className="lg:hidden">
        <header className="panel-glass sticky top-0 z-10 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Annual checkout recovery</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{assignmentId}</p>
        </header>
        <Tabs defaultValue="conversation" className="p-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversation">Chat</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="foundry">Foundry</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
          </TabsList>
          <TabsContent value="conversation">
            <Conversation />
          </TabsContent>
          <TabsContent value="plan">
            <MissionControl />
          </TabsContent>
          <TabsContent value="foundry">
            <Foundry />
          </TabsContent>
          <TabsContent value="outputs">
            <Outputs />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
