/**
 * Ambient module for optional @composio/core dependency.
 * SDK is ESM-only and requires Node 22.22.3+. Not installed by default so
 * unit tests and hosts below the floor still typecheck; live OAuth uses
 * connectedAccounts.link() (initiate() retired 2026-07-03).
 */
declare module "@composio/core" {
  export class Composio {
    constructor(opts: { apiKey: string });
    connectedAccounts: {
      link(
        userId: string,
        toolkit: string,
        opts?: { callbackUrl?: string },
      ): Promise<{ redirectUrl?: string; redirect_url?: string; id?: string }>;
    };
    tools: {
      execute(
        slug: string,
        opts: {
          userId: string;
          connectedAccountId?: string;
          arguments: Record<string, unknown>;
          dangerouslySkipVersionCheck?: boolean;
        },
      ): Promise<{ data?: { id?: string }; id?: string }>;
    };
  }
}
