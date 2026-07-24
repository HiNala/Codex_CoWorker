import { createServer } from "node:http";
import { getFlags, log, parseFoundryEnv } from "@forge/config";
import { CapabilitySpec } from "@forge/contracts";
import { FakeCodex } from "@forge/foundry-core";

const environment = parseFoundryEnv();
const flags = getFlags();
const fakeCodex = new FakeCodex(environment.FAKE_CODEX_PACE_MS);

function send(
  response: import("node:http").ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > 1_000_000) throw new Error("Request body exceeds 1 MB.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer((request, response) => {
  void (async () => {
    if (request.method === "GET" && request.url === "/health/live") {
      send(response, 200, { status: "live" });
      return;
    }

    if (request.method === "GET" && request.url === "/health/ready") {
      const liveRequested = flags.adapters.codex === "live";
      const liveConfigured = Boolean(environment.CODEX_API_KEY);
      send(response, liveRequested && !liveConfigured ? 503 : 200, {
        status: liveRequested && !liveConfigured ? "not_ready" : "ready",
        adapter: flags.adapters.codex,
        codexCredential: liveConfigured ? "configured" : "not_configured",
        databaseCredentialPresent: Boolean(process.env.DATABASE_URL),
      });
      return;
    }

    if (request.method === "POST" && request.url === "/v1/build") {
      if (flags.adapters.codex !== "fake") {
        send(response, 503, {
          status: "not_implemented",
          detail:
            "The live Codex adapter belongs to Track B; ignition serves the deterministic fake.",
        });
        return;
      }

      try {
        const body = (await readJson(request)) as Record<string, unknown>;
        const spec = CapabilitySpec.parse(body.spec);
        const events: Array<Record<string, unknown>> = [];
        const result = await fakeCodex.build(
          {
            spec,
            workspaceFiles: {},
            outputSchema: {},
            timeoutMs: 120_000,
          },
          (event) => events.push(event as unknown as Record<string, unknown>),
        );
        send(response, 200, { status: "built", events, result });
      } catch (error) {
        send(response, 400, {
          status: "invalid_request",
          detail: error instanceof Error ? error.message : "unknown build request error",
        });
      }
      return;
    }

    send(response, 404, { status: "not_found" });
  })();
});

server.listen(environment.FOUNDRY_PORT, "0.0.0.0", () => {
  log("info", "Foundry service started.", {
    port: environment.FOUNDRY_PORT,
    adapter: flags.adapters.codex,
    secretBoundary: "CODEX_API_KEY only",
  });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
