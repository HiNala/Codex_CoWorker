import type { ConnectionStatus } from "@forge/contracts";
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
}

/**
 * Honest per-provider status. Never returns secrets, not even truncated.
 * Missing credentials → not_configured (fake takes over with a visible badge).
 */
export function integrationStatus(env: IntegrationEnvSnapshot = process.env): ConnectionStatus[] {
  const zendeskLive = isZendeskConfigured(env);
  const zendeskWebhook = Boolean(env.ZENDESK_WEBHOOK_SECRET?.trim());

  return [
    {
      provider: "zendesk",
      state: zendeskLive ? "connected" : "not_configured",
      detail: zendeskLive
        ? zendeskWebhook
          ? "ticket API + webhook secret configured"
          : "ticket API configured; webhook secret missing"
        : "using imported demo tickets",
    },
    {
      provider: "octen",
      state: env.OCTEN_API_KEY?.trim() ? "connected" : "not_configured",
      detail: env.OCTEN_API_KEY?.trim() ? "research gateway ready" : "using fake research evidence",
    },
    {
      provider: "composio",
      state: env.COMPOSIO_API_KEY?.trim()
        ? env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()
          ? "connected"
          : "degraded"
        : "not_configured",
      detail: env.COMPOSIO_API_KEY?.trim()
        ? env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()
          ? "Gmail connected account present"
          : "API key present; Gmail OAuth link() not completed"
        : "Slack/Gmail unavailable",
    },
    {
      provider: "github",
      state: env.GITHUB_TOKEN?.trim() || env.GITHUB_PAT?.trim() ? "connected" : "not_configured",
      detail:
        env.GITHUB_TOKEN?.trim() || env.GITHUB_PAT?.trim()
          ? "fine-grained PAT configured for PR pipeline"
          : "using FakeGitHubPullRequestAdapter",
    },
    {
      provider: "email",
      state:
        (env.COMPOSIO_API_KEY?.trim() && env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()) ||
        env.RESEND_API_KEY?.trim()
          ? "connected"
          : "not_configured",
      detail: env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()
        ? "Composio Gmail primary"
        : env.RESEND_API_KEY?.trim()
          ? "Resend fallback"
          : "using FakeNotifier",
    },
  ];
}
