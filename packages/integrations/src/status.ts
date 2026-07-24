import type { ConnectionStatus } from "@forge/contracts";
import { composioLiveReady, meetsComposioNodeFloor } from "./composio/client";
import { isZendeskConfigured } from "./zendesk/ticket-gateway";

export interface IntegrationEnvSnapshot {
  ZENDESK_SUBDOMAIN?: string | undefined;
  ZENDESK_EMAIL?: string | undefined;
  ZENDESK_API_TOKEN?: string | undefined;
  ZENDESK_WEBHOOK_SECRET?: string | undefined;
  OCTEN_API_KEY?: string | undefined;
  COMPOSIO_API_KEY?: string | undefined;
  COMPOSIO_GMAIL_ACCOUNT_ID?: string | undefined;
  COMPOSIO_USER_ID?: string | undefined;
  GITHUB_TOKEN?: string | undefined;
  GITHUB_PAT?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  RESEND_FROM?: string | undefined;
  /** Override process.versions.node for tests / honest degrade. */
  nodeVersion?: string | undefined;
  /**
   * Optional worker probe: when known unreachable, surface degraded on
   * providers that only run through the worker (never hang, never green-lie).
   */
  workerReachable?: boolean | undefined;
}

/**
 * Honest per-provider status. Never returns secrets, not even truncated.
 * Missing credentials → not_configured (fake takes over with a visible badge).
 * Partial OAuth / Node floor miss → degraded, not connected.
 * Must match factory readiness (createNotifier / createPullRequestPort / etc).
 */
export function integrationStatus(env: IntegrationEnvSnapshot = process.env): ConnectionStatus[] {
  const zendeskLive = isZendeskConfigured(env);
  const zendeskWebhook = Boolean(env.ZENDESK_WEBHOOK_SECRET?.trim());
  const githubLive = Boolean(env.GITHUB_TOKEN?.trim() || env.GITHUB_PAT?.trim());
  const octenLive = Boolean(env.OCTEN_API_KEY?.trim());
  const nodeVersion = env.nodeVersion ?? process.versions.node;
  const composio = composioLiveReady({
    COMPOSIO_API_KEY: env.COMPOSIO_API_KEY,
    COMPOSIO_USER_ID: env.COMPOSIO_USER_ID,
    COMPOSIO_GMAIL_ACCOUNT_ID: env.COMPOSIO_GMAIL_ACCOUNT_ID,
    nodeVersion,
  });
  const resendLive = Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim());
  const emailLive = composio.ready || resendLive;
  const workerDown = env.workerReachable === false;

  const statuses: ConnectionStatus[] = [
    {
      provider: "zendesk",
      state: zendeskLive ? (workerDown ? "degraded" : "connected") : "not_configured",
      detail: zendeskLive
        ? workerDown
          ? "credentials set but worker unreachable — tickets will not process live"
          : zendeskWebhook
            ? "ticket API + webhook secret configured"
            : "ticket API configured; webhook secret missing — import path still available"
        : "not_configured · using imported demo tickets (Fake/ImportTicketGateway)",
    },
    {
      provider: "octen",
      state: octenLive ? (workerDown ? "degraded" : "connected") : "not_configured",
      detail: octenLive
        ? workerDown
          ? "OCTEN_API_KEY set but worker unreachable — research will not run live"
          : "research gateway credentials present"
        : "not_configured · using FakeResearchGateway",
    },
    {
      provider: "composio",
      state: !env.COMPOSIO_API_KEY?.trim()
        ? "not_configured"
        : composio.ready
          ? workerDown
            ? "degraded"
            : "connected"
          : "degraded",
      detail: !env.COMPOSIO_API_KEY?.trim()
        ? "not_configured · Slack/Gmail unavailable"
        : composio.ready
          ? workerDown
            ? "Gmail linked but worker unreachable"
            : "Gmail connectedAccounts.link complete"
          : `degraded · ${composio.reason}`,
    },
    {
      provider: "github",
      state: githubLive ? (workerDown ? "degraded" : "connected") : "not_configured",
      detail: githubLive
        ? workerDown
          ? "PAT set but worker unreachable — PR open will not run live"
          : "fine-grained PAT configured for host PR pipeline"
        : "not_configured · using FakeGitHubPullRequestAdapter (no live PR)",
    },
    {
      provider: "email",
      // Must match createNotifier: only green if Composio fully ready OR Resend full.
      state: emailLive ? (workerDown ? "degraded" : "connected") : "not_configured",
      detail: composio.ready
        ? workerDown
          ? "Composio Gmail ready but worker unreachable"
          : "Composio Gmail primary"
        : resendLive
          ? workerDown
            ? "Resend configured but worker unreachable"
            : "Resend fallback"
          : env.COMPOSIO_API_KEY?.trim()
            ? `not_configured · FakeNotifier (${composio.reason})`
            : "not_configured · using FakeNotifier",
    },
  ];

  // Node floor note for operators — never claim Composio connected below floor.
  if (env.COMPOSIO_API_KEY?.trim() && !meetsComposioNodeFloor(nodeVersion)) {
    const idx = statuses.findIndex((s) => s.provider === "composio");
    if (idx >= 0) {
      statuses[idx] = {
        provider: "composio",
        state: "degraded",
        detail: `degraded · Node ${nodeVersion} below Composio floor 22.22.3 — live SDK disabled`,
      };
    }
  }

  return statuses;
}
