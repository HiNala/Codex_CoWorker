/**
 * Composio integration surface (Gmail OAuth link + tool helpers).
 *
 * Operator OAuth (night-before checklist):
 * - COMPOSIO_API_KEY set on worker only
 * - createComposioConnectLink({ userId, toolkit: "gmail" }) → open redirectUrl
 * - Persist connected account id as COMPOSIO_GMAIL_ACCOUNT_ID
 * - Node must be ≥ 22.22.3 for live SDK; otherwise degrade to Resend/Fake
 *
 * Never call initiate() for managed OAuth — retired 2026-07-03; use link().
 */

export {
  COMPOSIO_NODE_FLOOR,
  ComposioError,
  composioLiveReady,
  createComposioConnectLink,
  createLiveComposioToolExecutor,
  loadComposioSdk,
  meetsComposioNodeFloor,
  parseSemver,
  type ComposioConnectLinkResult,
  type ComposioToolExecuteArgs,
  type ComposioToolExecutor,
  type ComposioToolkit,
  type LoadedComposioClient,
} from "./client";

export {
  GMAIL_FETCH_TOOL,
  GMAIL_REPLY_TOOL,
  GMAIL_SEND_TOOL,
  gmailReadRecent,
  gmailReply,
  gmailSend,
  type GmailMessageSummary,
  type GmailReadParams,
  type GmailReplyParams,
  type GmailSendParams,
} from "./gmail";
