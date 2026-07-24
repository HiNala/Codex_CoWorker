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
      {...(onPause ? { onPause } : {})}
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

      {/*
        Single DOM tree for ≥1280px is cockpit-grid above.
        Mid / phone: ONE alternate layout only (never both at once → no phantom columns).
      */}
      <div className="hidden min-h-dvh flex-col max-[1279px]:flex">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="hidden max-[1279px]:min-[901px]:block">
            <DextworkSidebar runTitle={state.title} runStatus={state.status} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Tabs
              value={railTab === "plan" || railTab === "foundry" ? railTab : "chat"}
              onValueChange={(v) => {
                if (v === "chat") setRailTab("plan");
                else setRailTab(v as "plan" | "foundry");
              }}
              defaultValue="chat"
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="grid h-11 w-full shrink-0 grid-cols-3 rounded-none border-b border-border">
                <TabsTrigger value="chat" className="text-xs" onClick={() => setRailTab("plan")}>
                  Chat
                  {pendingApprovals > 0 ? (
                    <span className="ms-1 tabular-nums text-[10px]">{pendingApprovals}</span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs">
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="foundry" className="text-xs">
                  Caps
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                {conversationNode}
              </TabsContent>
              <TabsContent value="plan" className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                {missionNode}
              </TabsContent>
              <TabsContent value="foundry" className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                {foundryNode}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
