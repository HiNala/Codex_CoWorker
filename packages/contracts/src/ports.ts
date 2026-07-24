import type { z } from "zod";
import type { EvidenceRecord } from "./artifact";
import type { CapabilitySpec } from "./capability";
import type { ExternalActionProposal } from "./approval";
import type { GateResult } from "./verification";

export type ModelTier = "primary" | "balanced" | "economy";

export interface ModelInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface NormalisedModelEvent {
  type: "text_delta" | "reasoning_summary" | "tool_call" | "completed";
  text?: string;
  toolName?: string;
  arguments?: unknown;
}

export interface AgentModel {
  structured<T>(request: {
    schema: z.ZodType<T>;
    system: string;
    input: ModelInput[];
    model?: ModelTier;
    maxOutputTokens?: number;
  }): Promise<{ value: T; usage: Usage; reasoningSummary?: string }>;

  stream(request: {
    system: string;
    input: ModelInput[];
    tools?: ToolDescriptor[];
    model?: ModelTier;
  }): AsyncIterable<NormalisedModelEvent>;
}

export interface CodexEvent {
  type: "session.started" | "output" | "file.changed" | "completed" | "failed";
  sessionId: string;
  summary: string;
  detail?: unknown;
}

export interface CodexBuildResult {
  sessionId: string;
  files: Record<string, string>;
  summary: string;
}

export interface CodexAdapter {
  build(
    request: {
      spec: CapabilitySpec;
      workspaceFiles: Record<string, string>;
      outputSchema: object;
      timeoutMs: number;
    },
    onEvent: (event: CodexEvent) => void,
  ): Promise<CodexBuildResult>;
  repair(
    request: { sessionId: string; failure: GateResult; timeoutMs: number },
    onEvent: (event: CodexEvent) => void,
  ): Promise<CodexBuildResult>;
  cancel(sessionId: string): Promise<void>;
}

export interface ResearchGateway {
  search(request: {
    query: string;
    includeDomains?: string[];
    excludeDomains?: string[];
    limit?: number;
    since?: string;
  }): Promise<EvidenceRecord[]>;
  news(request: { query: string; limit?: number }): Promise<EvidenceRecord[]>;
  extract(request: { urls: string[]; query?: string }): Promise<EvidenceRecord[]>;
}

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  requester: string;
  status: "new" | "open" | "pending" | "solved" | "closed";
  createdAt: string;
}

export interface TicketGateway {
  listRecent(request: { since?: string; limit?: number }): Promise<Ticket[]>;
  get(id: string): Promise<Ticket>;
  addPrivateNote(id: string, body: string, idempotencyKey: string): Promise<void>;
  draftPublicReply(id: string, body: string): Promise<{ draftId: string }>;
}

export type ConnectionState = "connected" | "disconnected" | "degraded" | "not_configured";

export interface ConnectionStatus {
  provider: string;
  state: ConnectionState;
  detail?: string;
}

export interface ActionResult {
  provider: string;
  action: string;
  externalId: string;
  permalink?: string;
}

export interface ActionGateway {
  available(orgId: string): Promise<ConnectionStatus[]>;
  execute(proposal: ExternalActionProposal, approvalId: string): Promise<ActionResult>;
}

export interface ObjectStore {
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<{ sha256: string }>;
  get(key: string): Promise<Buffer>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
  delete(key: string): Promise<void>;
  downloadUrl(key: string, ttlSeconds: number): Promise<string>;
  uploadUrl(key: string, ttlSeconds: number, contentType: string): Promise<string>;
}
