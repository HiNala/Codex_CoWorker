import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./same-origin";
import { gateDemoStart } from "./demo-start-gate";

function req(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("allows matching Origin", () => {
    expect(
      isSameOriginRequest(
        req("https://dextwork.com/api/demo/start", {
          origin: "https://dextwork.com",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-site Sec-Fetch-Site", () => {
    expect(
      isSameOriginRequest(
        req("https://dextwork.com/api/demo/start", {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("rejects mismatched Origin host", () => {
    expect(
      isSameOriginRequest(
        req("https://dextwork.com/api/demo/start", {
          origin: "https://evil.example",
        }),
      ),
    ).toBe(false);
  });
});

describe("gateDemoStart", () => {
  it("blocks production unless DEMO_MODE=1", () => {
    expect(gateDemoStart({ NODE_ENV: "production", DEMO_MODE: "0" }).ok).toBe(false);
    expect(gateDemoStart({ NODE_ENV: "production", DEMO_MODE: "1" }).ok).toBe(true);
    expect(gateDemoStart({ NODE_ENV: "development" }).ok).toBe(true);
  });
});
