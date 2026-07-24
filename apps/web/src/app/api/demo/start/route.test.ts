import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function startRequest(
  origin = "https://dextwork.com",
  body: unknown = { assignmentId: "attacker", evil: true },
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request("https://dextwork.com/api/demo/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "sec-fetch-site": "same-origin",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/demo/start", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses WORKER_INTERNAL_URL and forwards exact {}", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.railway.internal:3001");
    vi.stubEnv("WORKER_PUBLIC_URL", "https://should-not-hit.example");
    vi.stubEnv("WORKER_URL", "http://legacy:9");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          assignmentId: "0198206f-5f53-7000-8000-000000000005",
          runId: "0198206f-5f53-7000-8000-000000000006",
          lastSeq: 26,
          mode: "postgres",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(startRequest());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; runId: string };
    expect(json.ok).toBe(true);
    expect(json.runId).toBe("0198206f-5f53-7000-8000-000000000006");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://worker.railway.internal:3001/v1/golden-path/run",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: "{}",
    });
  });

  it("returns 503 not_configured when worker is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.down:3001");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

    const res = await POST(startRequest());
    expect(res.status).toBe(503);
    const json = (await res.json()) as { ok: boolean; code: string; message: string };
    expect(json.ok).toBe(false);
    expect(json.code).toBe("not_configured");
    expect(json.message).toMatch(/ECONNREFUSED|unreachable/i);
  });

  it("returns 503 when worker returns 404 (route missing)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.railway.internal:3001");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
      ),
    );

    const res = await POST(startRequest());
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("worker.route_missing");
  });

  it("rejects cross-origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      startRequest("https://evil.example", {}, { "sec-fetch-site": "cross-site" }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("cross_origin");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects production when DEMO_MODE!=1 (no access code path)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "0");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(startRequest());
    expect(res.status).toBe(403);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("production_blocked");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not require DEMO_ACCESS_CODE", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("DEMO_ACCESS_CODE", "secret-never-needed-for-start");
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.internal:3001");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, runId: "r1" }), { status: 200 }),
      ),
    );

    // No x-demo-access-code header
    const res = await POST(startRequest());
    expect(res.status).toBe(200);
  });
});
