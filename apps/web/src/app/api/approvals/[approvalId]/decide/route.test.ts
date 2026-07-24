import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const APPROVAL_ID = "0198206f-5f53-7000-8000-0000000000e1";

function decideRequest(
  decision: unknown,
  opts: { origin?: string; secFetchSite?: string; approvalId?: string } = {},
): Request {
  const id = opts.approvalId ?? APPROVAL_ID;
  return new Request(`https://dextwork.com/api/approvals/${id}/decide`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: opts.origin ?? "https://dextwork.com",
      "sec-fetch-site": opts.secFetchSite ?? "same-origin",
      "Idempotency-Key": "test-key-1",
    },
    body: JSON.stringify({ decision, runId: "0198206f-5f53-7000-8000-000000000006" }),
  });
}

const ctx = (approvalId = APPROVAL_ID) => ({
  params: Promise.resolve({ approvalId }),
});

describe("POST /api/approvals/:approvalId/decide", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates decision and proxies same-origin with WORKER_INTERNAL_URL", async () => {
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.railway.internal:3001/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, approvalId: APPROVAL_ID, decision: "approved" }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(decideRequest("approved"), ctx());
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `http://worker.railway.internal:3001/approvals/${APPROVAL_ID}/decide`,
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      decision: "approved",
      runId: "0198206f-5f53-7000-8000-000000000006",
    });
  });

  it("accepts approve|deny aliases", async () => {
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.internal:3001");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(decideRequest("deny"), ctx());
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).decision).toBe("denied");
  });

  it("rejects invalid decision", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(decideRequest("maybe"), ctx());
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("invalid_decision");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(
      decideRequest("approved", { origin: "https://evil.example", secFetchSite: "cross-site" }),
      ctx(),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID path id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(decideRequest("approved", { approvalId: "not-a-uuid" }), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when worker unreachable", async () => {
    vi.stubEnv("WORKER_INTERNAL_URL", "http://worker.down:3001");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const res = await POST(decideRequest("approved"), ctx());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("not_configured");
  });
});
