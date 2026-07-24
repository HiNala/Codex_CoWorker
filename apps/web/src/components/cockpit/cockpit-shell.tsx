"use client";

import { useState, type ReactNode } from "react";
import { LiveRegion } from "@forge/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationPanel } from "@/components/conversation/conversation-panel";
import { MissionControl } from "@/components/plan/mission-control";
import { FoundryPanel } from "@/components/foundry/foundry-panel";
import { useRunStream } from "@/hooks/use-run-stream";
import { useShellLayout } from "@/hooks/use-shell-layout";
import type { RunState } from "@/hooks/run-state";

export interface CockpitShellProps {
  assignmentId: string;
  useDemoFixture?: boolean;
  runId?: string;
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
 * Cockpit workspace only (chat + tasks/capabilities rail).
 * Universal Dextwork icon rail lives in (app)/layout — not here.
 */
export function CockpitShell({
  assignmentId,
  useDemoFixture = false,
  runId,
  conversation,
  missionControl,
  foundry,
  onPause: onPauseProp,
}: CockpitShellProps) {
  const layout = useShellLayout();
  const { state, controls, streamMode } = useRunStream(assignmentId, {
    useDemoFixture,
    ...(runId ? { runId } : {}),
  });

  const [mobileTab, setMobileTab] = useState<"chat" | "plan" | "foundry">("chat");

  const onApprove = controls.approve;
  const onDeny = controls.deny;
  const onSend = controls.send;
  const onPause = () => {
    controls.pause();
    onPauseProp?.();
  };

  const defaultConversation = (
    <ConversationPanel
      state={state}
      onApprove={onApprove}
      onDeny={onDeny}
      onSend={onSend}
      onPause={onPause}
      assignmentId={assignmentId}
    />
  );
  const defaultMission = <MissionControl state={state} />;
  const defaultFoundry = <FoundryPanel state={state} />;

  const conversationNode = resolveSlot(conversation, state, defaultConversation);
  const missionNode = resolveSlot(missionControl, state, defaultMission);
  const foundryNode = resolveSlot(foundry, state, defaultFoundry);

  const pendingApprovals = state.approvals.filter((a) => a.status === "pending").length;

  const shellAttrs = {
    "data-cockpit": true,
    "data-shell-layout": layout,
    "data-stream-mode": streamMode,
    "data-use-demo-fixture": streamMode === "fixture" ? "true" : "false",
    "data-last-seq": state.lastSeq,
    "data-connected": state.connected ? "true" : "false",
    "data-timeline-count": state.timeline.length,
  } as const;

  return (
    <>
      <LiveRegion message={state.announcement} />

      {layout === "desktop" ? (
        <div className="cockpit-grid" {...shellAttrs}>
          <div className="cockpit-chat">{conversationNode}</div>
          <div className="cockpit-rail">
            {missionNode}
            {foundryNode}
          </div>
        </div>
      ) : null}

      {layout === "tablet" || layout === "mobile" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden" {...shellAttrs}>
          <Tabs
            value={mobileTab}
            onValueChange={(v) => setMobileTab(v as "chat" | "plan" | "foundry")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid h-11 w-full shrink-0 grid-cols-3 rounded-none border-b border-border">
              <TabsTrigger value="chat" className="text-xs">
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
            <TabsContent
              value="chat"
              className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {conversationNode}
            </TabsContent>
            <TabsContent
              value="plan"
              className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {missionNode}
            </TabsContent>
            <TabsContent
              value="foundry"
              className="m-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {foundryNode}
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </>
  );
}
