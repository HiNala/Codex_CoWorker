import { describe, expect, it } from "vitest";
import { resolveWorkerBase } from "./worker-base";

describe("resolveWorkerBase", () => {
  it("prefers WORKER_INTERNAL_URL first", () => {
    expect(
      resolveWorkerBase({
        WORKER_INTERNAL_URL: "http://worker.railway.internal:3001/",
        WORKER_PUBLIC_URL: "https://worker.public.example",
        WORKER_URL: "http://should-not-use:9",
      }),
    ).toBe("http://worker.railway.internal:3001");
  });

  it("falls back to WORKER_PUBLIC_URL then WORKER_URL then localhost", () => {
    expect(
      resolveWorkerBase({
        WORKER_PUBLIC_URL: "https://worker.public.example/",
        WORKER_URL: "http://legacy:3001",
      }),
    ).toBe("https://worker.public.example");

    expect(resolveWorkerBase({ WORKER_URL: "http://legacy:3001/" })).toBe("http://legacy:3001");
    expect(resolveWorkerBase({})).toBe("http://127.0.0.1:3001");
  });
});
