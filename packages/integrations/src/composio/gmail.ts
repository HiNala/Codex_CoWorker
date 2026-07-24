/**
 * Composio Gmail read + send helpers behind injectable tool execution.
 *
 * Live path: tools.execute("GMAIL_SEND_EMAIL" | "GMAIL_FETCH_EMAILS", …)
 * with a connected account from connectedAccounts.link().
 * Tests inject executeTool — no network, no secrets in fixtures.
 */

import type { ComposioToolExecutor } from "./client";

export const GMAIL_SEND_TOOL = "GMAIL_SEND_EMAIL" as const;
export const GMAIL_FETCH_TOOL = "GMAIL_FETCH_EMAILS" as const;
export const GMAIL_REPLY_TOOL = "GMAIL_REPLY_TO_THREAD" as const;

export interface GmailSendParams {
  to: string;
  subject: string;
  body: string;
  userId: string;
  connectedAccountId?: string | undefined;
  executeTool: ComposioToolExecutor;
}

export interface GmailReadParams {
  userId: string;
  connectedAccountId?: string | undefined;
  /** Max messages to return (Composio argument; clamped 1–20). */
  maxResults?: number | undefined;
  query?: string | undefined;
  executeTool: ComposioToolExecutor;
}

export interface GmailMessageSummary {
  id: string;
  /** Upstream fields may be missing — explicit undefined is real data. */
  subject?: string | undefined;
  from?: string | undefined;
  snippet?: string | undefined;
  threadId?: string | undefined;
}

export interface GmailReplyParams {
  threadId: string;
  body: string;
  userId: string;
  connectedAccountId?: string | undefined;
  recipientEmail?: string | undefined;
  executeTool: ComposioToolExecutor;
}

/** Send a plain-text Gmail message via Composio tool slug GMAIL_SEND_EMAIL. */
export async function gmailSend(params: GmailSendParams): Promise<{ providerId: string }> {
  const out = await params.executeTool({
    toolSlug: GMAIL_SEND_TOOL,
    userId: params.userId,
    connectedAccountId: params.connectedAccountId,
    arguments: {
      recipient_email: params.to,
      subject: params.subject,
      body: params.body,
    },
    dangerouslySkipVersionCheck: true,
  });
  return { providerId: out.providerId };
}

/**
 * Read recent Gmail messages (bounded). Used for operator diagnostics /
 * reply context — not for silent autonomous inbox scraping.
 */
export async function gmailReadRecent(
  params: GmailReadParams,
): Promise<{ messages: GmailMessageSummary[]; providerId: string }> {
  const maxResults = Math.min(20, Math.max(1, params.maxResults ?? 5));
  const out = await params.executeTool({
    toolSlug: GMAIL_FETCH_TOOL,
    userId: params.userId,
    connectedAccountId: params.connectedAccountId,
    arguments: {
      max_results: maxResults,
      ...(params.query ? { query: params.query } : {}),
    },
    dangerouslySkipVersionCheck: true,
  });

  const raw = out.raw as { data?: { messages?: unknown[] }; messages?: unknown[] } | undefined;
  const list = (raw?.data?.messages ?? raw?.messages ?? []) as Array<Record<string, unknown>>;
  const messages: GmailMessageSummary[] = list.map((m, i) => ({
    id: String(m.id ?? m.messageId ?? `msg-${i}`),
    subject: m.subject != null ? String(m.subject) : undefined,
    from: m.from != null ? String(m.from) : undefined,
    snippet: m.snippet != null ? String(m.snippet) : undefined,
    threadId:
      m.threadId != null
        ? String(m.threadId)
        : m.thread_id != null
          ? String(m.thread_id)
          : undefined,
  }));

  return { messages, providerId: out.providerId };
}

/** Reply in an existing Gmail thread after human approval of exact body. */
export async function gmailReply(params: GmailReplyParams): Promise<{ providerId: string }> {
  const out = await params.executeTool({
    toolSlug: GMAIL_REPLY_TOOL,
    userId: params.userId,
    connectedAccountId: params.connectedAccountId,
    arguments: {
      thread_id: params.threadId,
      message_body: params.body,
      ...(params.recipientEmail ? { recipient_email: params.recipientEmail } : {}),
    },
    dangerouslySkipVersionCheck: true,
  });
  return { providerId: out.providerId };
}
