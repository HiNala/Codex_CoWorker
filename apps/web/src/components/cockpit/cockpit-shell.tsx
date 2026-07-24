"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LiveRegion } from "@forge/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationPanel } from "@/components/conversation/conversation-panel";
import { MissionControl } from "@/components/plan/mission-control";
import { FoundryPanel } from "@/components/foundry/foundry-panel";
import { ArtifactDock } from "@/components/dock/artifact-dock";
import { useRunStream } from "@/hooks/use-run-stream";
import type { RunState } from "@/hooks/run-state";
import { AssignmentBar } from "./assignment-bar";

export interface CockpitShellProps {
  assignmentId: string;
  /** When true (default), hydrate from demo fixture — no live SSE required. */
  useDemoFixture?: boolean;
  /** Override panels if a track needs a custom slot. */
  conversation?: ReactNode | ((state: RunState) => ReactNode);
  missionControl?: ReactNode | ((state: RunState) => ReactNode);
  foundry?: ReactNode | ((state: RunState) => ReactNode);
  dock?: ReactNode | ((state: RunState) => ReactNode);
  onPause?: () => void;
}

function resolveSlot(
  slot: ReactNode | ((state: RunState) => ReactNode) | undefined,
  state: RunState,
  fallback: ReactNode,
): ReactNode {
  if (slot == null) return fallback;
  return typeof slot === "function" ? slot(state) : slot;
}

/**
 * Cockpit layout shell. Owns the grid, assignment bar, run-stream hydrate,
 * and wires Track D panel surfaces (conversation, plan, foundry, dock).
 */
export function CockpitShell({
  assignmentId,
  useDemoFixture = true,
  conversation,
  missionControl,
  foundry,
  dock,
  onPause,
}: CockpitShellProps) {
  const state = useRunStream(assignmentId, { useDemoFixture });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const onApprove = useCallback((_approvalId: string) => {
    // Live path: POST approval via Track A. Demo fixture is static.
  }, []);
  const onDeny = useCallback((_approvalId: string) => {
    // Live path: POST denial via Track A.
  }, []);

  const defaultConversation = (
    <ConversationPanel state={state} onApprove={onApprove} onDeny={onDeny} />
  );
  const defaultMission = (
    <MissionControl state={state} onStepHover={setHoveredStepId} />
  );
  const defaultFoundry = (
    <FoundryPanel state={state} onApprove={onApprove} onDeny={onDeny} />
  );
  const artifacts = Object.values(state.artifacts);
  const dockHighlightClass = hoveredStepId
    ? "[&_[data-artifact-card]]:opacity-50 data-[related=true]:opacity-100"
    : undefined;
  const defaultDock = (
    <ArtifactDock
      artifacts={artifacts}
      collapsed={dockCollapsed}
      onCollapsedChange={setDockCollapsed}
      onOpenArtifact={() => {
        /* Track E canvas owns open */
      }}
      {...(dockHighlightClass ? { className: dockHighlightClass } : {})}
    />
  );

  const conversationNode = resolveSlot(conversation, state, defaultConversation);
  const missionNode = resolveSlot(missionControl, state, defaultMission);
  const foundryNode = resolveSlot(foundry, state, defaultFoundry);
  const dockNode = resolveSlot(dock, state, defaultDock);

  const tabBadge = (count: number) =>
    count > 0 ? (
      <span className="ms-1 inline-flex min-w-4 justify-center rounded-full bg-muted px-1 text-[10px] tabular-nums">
        {count}
      </span>
    ) : null;

  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;
  const readyArtifacts = artifacts.filter(
    (a) => a.status === "ready" || a.status === "published",
  ).length;

  return (
    <>
      <LiveRegion message={state.announcement} />
      <div className="cockpit-grid cockpit-desktop">
        <AssignmentBar
          assignmentId={assignmentId}
          state={state}
          {...(onPause ? { onPause } : {})}
        />
        <div className="cockpit-conversation min-h-0 border-e border-border">
          {conversationNode}
        </div>
        <div className="cockpit-right min-h-0">
          {missionNode}
          {foundryNode}
        </div>
        <div className="cockpit-dock">{dockNode}</div>
      </div>

      <div className="lg:hidden">
        <AssignmentBar
          assignmentId={assignmentId}
          state={state}
          {...(onPause ? { onPause } : {})}
        />
        <Tabs defaultValue="conversation" className="p-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversation" className="min-h-11">
              Chat
              {tabBadge(pendingApprovals)}
            </TabsTrigger>
            <TabsTrigger value="plan" className="min-h-11">
              Plan
            </TabsTrigger>
            <TabsTrigger value="foundry" className="min-h-11">
              Foundry
            </TabsTrigger>
            <TabsTrigger value="outputs" className="min-h-11">
              Outputs
              {tabBadge(readyArtifacts)}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="conversation" className="min-h-0">
            {conversationNode}
          </TabsContent>
          <TabsContent value="plan" className="min-h-0">
            {missionNode}
          </TabsContent>
          <TabsContent value="foundry" className="min-h-0">
            {foundryNode}
          </TabsContent>
          <TabsContent value="outputs" className="min-h-0">
            {dockNode}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
