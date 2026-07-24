/**
 * Composio client helpers for Gmail (and Slack if callers need them).
 *
 * Auth: use connectedAccounts.link() — initiate() was retired 2026-07-03 for
 * managed OAuth. SDK is ESM-only and requires Node 22.22.3+.
 *
 * Never log COMPOSIO_API_KEY or any token values.
 */

/** Composio TypeScript SDK engine floor (ESM-only). Host may be older — degrade. */
export const COMPOSIO_NODE_FLOOR = "22.22.3" as const;

export type ComposioToolkit = "gmail" | "slack";

export interface ComposioConnectLinkResult {
  redirectUrl: string;
  /** Present when the SDK returns a request id; may be explicit undefined. */
  connectionRequestId?: string | undefined;
}

export interface ComposioToolExecuteArgs {
  toolSlug: string;
  userId: string;
  /** Optional Composio connected-account id — may be explicit undefined from config. */
  connectedAccountId?: string | undefined;
  arguments: Record<string, unknown>;
  dangerouslySkipVersionCheck?: boolean | undefined;
}

export type ComposioToolExecutor = (
  args: ComposioToolExecuteArgs,
) => Promise<{ providerId: string; raw?: unknown }>;

export interface LoadedComposioClient {
  connectedAccounts: {
    link(
      userId: string,
      toolkit: string,
      opts?: { callbackUrl?: string | undefined },
    ): Promise<{
      redirectUrl?: string | undefined;
      redirect_url?: string | undefined;
      id?: string | undefined;
    }>;
  };
  tools: {
    execute(
      slug: string,
      opts: {
        userId: string;
        connectedAccountId?: string | undefined;
        arguments: Record<string, unknown>;
        dangerouslySkipVersionCheck?: boolean | undefined;
      },
    ): Promise<{ data?: { id?: string | undefined }; id?: string | undefined }>;
  };
}

export class ComposioError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ComposioError";
    this.code = code;
  }
}

/**
 * Parse "22.22.3" style versions. Returns null if unparseable.
 */
export function parseSemver(version: string): [number, number, number] | null {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** True when running Node meets the Composio SDK floor. */
export function meetsComposioNodeFloor(nodeVersion: string = process.versions.node): boolean {
  const current = parseSemver(nodeVersion);
  const floor = parseSemver(COMPOSIO_NODE_FLOOR);
  if (!current || !floor) return false;
  for (let i = 0; i < 3; i++) {
    if (current[i]! > floor[i]!) return true;
    if (current[i]! < floor[i]!) return false;
  }
  return true;
}

/**
 * Honest readiness for live Composio. Missing key, missing account link, or
 * Node below floor → not ready (callers must use fake/Resend).
 */
export function composioLiveReady(env: {
  COMPOSIO_API_KEY?: string | undefined;
  COMPOSIO_USER_ID?: string | undefined;
  COMPOSIO_GMAIL_ACCOUNT_ID?: string | undefined;
  nodeVersion?: string | undefined;
}): { ready: boolean; reason: string } {
  if (!env.COMPOSIO_API_KEY?.trim()) {
    return { ready: false, reason: "COMPOSIO_API_KEY not set" };
  }
  if (!env.COMPOSIO_USER_ID?.trim()) {
    return { ready: false, reason: "COMPOSIO_USER_ID not set" };
  }
  if (!env.COMPOSIO_GMAIL_ACCOUNT_ID?.trim()) {
    return {
      ready: false,
      reason: "COMPOSIO_GMAIL_ACCOUNT_ID missing — complete connectedAccounts.link() OAuth",
    };
  }
  const nodeVersion = env.nodeVersion ?? process.versions.node;
  if (!meetsComposioNodeFloor(nodeVersion)) {
    return {
      ready: false,
      reason: `Node ${nodeVersion} is below Composio floor ${COMPOSIO_NODE_FLOOR}`,
    };
  }
  return { ready: true, reason: "ok" };
}

/**
 * Dynamically import @composio/core. Package stays loadable when the optional
 * dependency is absent (unit tests, hosts that only use Fake/Resend).
 */
export async function loadComposioSdk(apiKey: string): Promise<LoadedComposioClient> {
  const mod = await import("@composio/core").catch(() => null);
  if (!mod || !("Composio" in mod)) {
    throw new ComposioError(
      "composio.sdk_missing",
      "@composio/core is not installed; cannot use live Composio adapters",
    );
  }
  const { Composio } = mod as { Composio: new (opts: { apiKey: string }) => LoadedComposioClient };
  return new Composio({ apiKey });
}

/**
 * Start managed OAuth via connectedAccounts.link() (NOT initiate()).
 *
 * Operator flow (do this before the demo window):
 * 1. Ensure COMPOSIO_API_KEY is set in the worker env (never in browser bundles).
 * 2. Choose an immutable internal userId (UUID) — never the operator's email.
 * 3. Call createComposioConnectLink({ apiKey, userId, toolkit: "gmail" }).
 * 4. Open redirectUrl in a browser; complete Google OAuth as the presenter account.
 * 5. After redirect, copy the connected account id into COMPOSIO_GMAIL_ACCOUNT_ID.
 * 6. Restart worker; integrationStatus should show composio/email as connected.
 *
 * If the host Node is below 22.22.3, fail with composio.node_floor so the UI
 * can show not_configured instead of a cryptic ESM import crash.
 */
export async function createComposioConnectLink(input: {
  apiKey: string;
  userId: string;
  toolkit?: ComposioToolkit | undefined;
  callbackUrl?: string | undefined;
  /** Injected for tests — skips dynamic SDK import. */
  client?: LoadedComposioClient | undefined;
  nodeVersion?: string | undefined;
}): Promise<ComposioConnectLinkResult> {
  const nodeVersion = input.nodeVersion ?? process.versions.node;
  if (!meetsComposioNodeFloor(nodeVersion)) {
    throw new ComposioError(
      "composio.node_floor",
      `Composio SDK requires Node ${COMPOSIO_NODE_FLOOR}+; host is ${nodeVersion}`,
    );
  }
  if (!input.apiKey.trim()) {
    throw new ComposioError("composio.not_configured", "COMPOSIO_API_KEY is required for link()");
  }
  if (!input.userId.trim()) {
    throw new ComposioError("composio.not_configured", "userId is required for link()");
  }

  const toolkit = input.toolkit ?? "gmail";
  const client = input.client ?? (await loadComposioSdk(input.apiKey));
  const connectionRequest = await client.connectedAccounts.link(input.userId, toolkit, {
    callbackUrl: input.callbackUrl,
  });

  const redirectUrl =
    connectionRequest.redirectUrl ?? (connectionRequest as { redirect_url?: string }).redirect_url;
  if (!redirectUrl) {
    throw new ComposioError(
      "composio.link_failed",
      "connectedAccounts.link() returned no redirectUrl",
    );
  }

  return {
    redirectUrl,
    connectionRequestId: connectionRequest.id,
  };
}

/**
 * Live tool executor wrapping composio.tools.execute.
 * Prefer injecting a fake executor in tests — never hit Gmail from unit tests.
 */
export function createLiveComposioToolExecutor(apiKey: string): ComposioToolExecutor {
  return async (args) => {
    const client = await loadComposioSdk(apiKey);
    const result = await client.tools.execute(args.toolSlug, {
      userId: args.userId,
      connectedAccountId: args.connectedAccountId,
      arguments: args.arguments,
      dangerouslySkipVersionCheck: args.dangerouslySkipVersionCheck ?? true,
    });
    const providerId =
      (result as { data?: { id?: string } }).data?.id ??
      (result as { id?: string }).id ??
      args.toolSlug;
    return { providerId, raw: result };
  };
}
