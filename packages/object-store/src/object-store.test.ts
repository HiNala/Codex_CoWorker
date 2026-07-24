import { describe, expect, it } from "vitest";
import { FakeObjectStore } from "./fake";

describe("ObjectStore contract", () => {
  it("round-trips, heads, hashes, and deletes an object", async () => {
    const store = new FakeObjectStore();
    const result = await store.put("artifact/test.txt", Buffer.from("forge"), "text/plain");

    expect(result.sha256).toHaveLength(64);
    await expect(store.get("artifact/test.txt")).resolves.toEqual(Buffer.from("forge"));
    await expect(store.head("artifact/test.txt")).resolves.toEqual({
      size: 5,
      contentType: "text/plain",
    });

    await store.delete("artifact/test.txt");
    await expect(store.head("artifact/test.txt")).resolves.toBeNull();
  });
});
