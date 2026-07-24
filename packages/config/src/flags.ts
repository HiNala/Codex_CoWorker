import { z } from "zod";

const fakeOrLive = z.enum(["fake", "live"]);

const FlagsSchema = z.object({
  adapters: z.object({
    openai: fakeOrLive,
    codex: fakeOrLive,
    octen: fakeOrLive,
    composio: fakeOrLive,
    zendesk: fakeOrLive,
    sandbox: z.enum(["docker", "railway", "fake"]),
  }),
  auth: z.enum(["dev", "real"]),
  fakeSeed: z.string().min(1),
  fakeFailureMode: z.enum(["none", "rate_limit", "timeout", "schema_error", "gate_failure"]),
});

export type Flags = z.infer<typeof FlagsSchema>;

export function getFlags(environment: NodeJS.ProcessEnv = process.env): Flags {
  return FlagsSchema.parse({
    adapters: {
      openai: environment.ADAPTER_OPENAI ?? "fake",
      codex: environment.ADAPTER_CODEX ?? "fake",
      octen: environment.ADAPTER_OCTEN ?? "fake",
      composio: environment.ADAPTER_COMPOSIO ?? "fake",
      zendesk: environment.ADAPTER_ZENDESK ?? "fake",
      sandbox: environment.ADAPTER_SANDBOX ?? "docker",
    },
    auth: environment.AUTH_MODE ?? "dev",
    fakeSeed: environment.FAKE_SEED ?? "forge-demo-v1",
    fakeFailureMode: environment.FAKE_FAILURE_MODE ?? "none",
  });
}
