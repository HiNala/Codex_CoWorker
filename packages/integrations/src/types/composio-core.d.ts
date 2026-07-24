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
}
