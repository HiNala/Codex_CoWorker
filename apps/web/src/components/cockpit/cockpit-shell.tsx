"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LiveRegion } from "@forge/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationPanel } from "@/components/conversation/conversation-panel";
import { MissionControl } from "@/components/plan/mission-control";
import { FoundryPanel } from "@/components/foundry/foundry-panel";
import { useRunStream } from "@/hooks/use-run-stream";
import type { RunState } from "@/hooks/run-state";
import { DextworkSidebar } from "./dextwork-sidebar";

export interface CockpitShellProps {
  assignmentId: string;
  /**
   * Live SSE is the default (useDemoFixture=false) so the cockpit paints
   * Cael's persisted run events. Opt into fixture only for offline UI demos.
   */
  useDemoFixture?: boolean;
  /** Optional explicit run id; otherwise demo seed maps assignment → run. */
  runId?: string;
  conversation?: ReactNode | ((state: RunState) => ReactNode);
  missionControl?: ReactNode | ((state: RunState) => ReactNode);
  foundry?: ReactNode | ((state: RunState) => ReactNode);
  /** @deprecated bottom dock removed — outputs live in chat */
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
 * Dextwork desktop shell: 76px sidebar | dominant chat | task+capabilities rail.
 * One scroll per region; body never scrolls; no full-width output dock.
 */
export function CockpitShell({
  assignmentId,
  useDemoFixture = false,
  runId,
  conversation,
  missionControl,
  foundry,
  onPause,
}: CockpitShellProps) {
  // IT RUNS criterion 3: paint live SSE (Cael), not the static fixture.
  const state = useRunStream(assignmentId, {
    useDemoFixture,
    ...(runId ? { runId } : {}),
  });
  const [railTab, setRailTab] = useState<"plan" | "foundry">("plan");

  const onApprove = useCallback((approvalId: string) => {
    void approvalId;
  }, []);
  const onDeny = useCallback((approvalId: string) => {
    void approvalId;
  }, []);

  const defaultConversation = (
    <ConversationPanel
      state={state}
      onApprove={onApprove}
      onDeny={onDeny}
      assignmentId={assignmentId}
      onPause={onPause}
    />
  );
  const defaultMission = <MissionControl state={state} />;
  const defaultFoundry = <FoundryPanel state={state} onApprove={onApprove} onDeny={onDeny} />;

  const conversationNode = resolveSlot(conversation, state, defaultConversation);
  const missionNode = resolveSlot(missionControl, state, defaultMission);
  const foundryNode = resolveSlot(foundry, state, defaultFoundry);

  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;

  return (
    <>
      <LiveRegion message={state.announcement} />
      <div
        className="cockpit-grid cockpit-desktop"
        data-dextwork-shell
        data-ops-console
        data-use-demo-fixture={useDemoFixture ? "true" : "false"}
        data-last-seq={state.lastSeq}
        data-connected={state.connected ? "true" : "false"}
        data-timeline-count={state.timeline.length}
      >
        <DextworkSidebar runTitle={state.title} runStatus={state.status} />
        <div className="cockpit-chat">{conversationNode}</div>
        <div className="cockpit-rail">
          {missionNode}
          {foundryNode}
        </div>
      </div>

      {/* Narrow desktop: chat + tabbed rail */}
      <div className="cockpit-desktop-rail-tabs hidden min-h-0 flex-col lg:hidden min-[901px]:max-[1279px]:flex">
        <div className="flex min-h-0 flex-1 border-t border-border">
          <DextworkSidebar runTitle={state.title} runStatus={state.status} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">{conversationNode}</div>
            <Tabs
              value={railTab}
              onValueChange={(v) => setRailTab(v as "plan" | "foundry")}
              className="shrink-0 border-t border-border"
            >
              <TabsList className="grid h-10 w-full grid-cols-2 rounded-none">
                <TabsTrigger value="plan">Tasks</TabsTrigger>
                <TabsTrigger value="foundry">Capabilities</TabsTrigger>
              </TabsList>
              <TabsContent value="plan" className="m-0 h-[40dvh] overflow-hidden">
                {missionNode}
              </TabsContent>
              <TabsContent value="foundry" className="m-0 h-[40dvh] overflow-hidden">
                {foundryNode}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Phone: tabs only */}
      <div className="max-[900px]:block hidden min-[901px]:hidden">
        <Tabs defaultValue="conversation" className="flex min-h-dvh flex-col p-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conversation" className="min-h-10 text-xs">
              Chat
              {pendingApprovals > 0 ? (
                <span className="ms-1 tabular-nums text-[10px]">{pendingApprovals}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="plan" className="min-h-10 text-xs">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="foundry" className="min-h-10 text-xs">
              Caps
            </TabsTrigger>
          </TabsList>
          <TabsContent value="conversation" className="min-h-0 flex-1">
            {conversationNode}
          </TabsContent>
          <TabsContent value="plan" className="min-h-0 flex-1">
            {missionNode}
          </TabsContent>
          <TabsContent value="foundry" className="min-h-0 flex-1">
            {foundryNode}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
