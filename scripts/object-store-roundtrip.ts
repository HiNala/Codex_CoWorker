import { randomUUID } from "node:crypto";
import { parseStorageEnv } from "../packages/config/src/env";
import { S3ObjectStore } from "../packages/object-store/src/s3";

const store = new S3ObjectStore(parseStorageEnv());
const key = `health/roundtrip-${randomUUID()}.txt`;
const expected = Buffer.from(`FORGE storage round trip ${new Date().toISOString()}`);

try {
  const put = await store.put(key, expected, "text/plain; charset=utf-8");
  const head = await store.head(key);
  if (!head || head.size !== expected.byteLength) {
    throw new Error(`Object head mismatch for ${key}.`);
  }

  const actual = await store.get(key);
  if (!actual.equals(expected)) {
    throw new Error(`Object body mismatch for ${key}.`);
  }

  console.log(
    JSON.stringify({
      status: "ok",
      operation: "put/head/get/delete",
      key,
      sha256: put.sha256,
      size: head.size,
    }),
  );
} finally {
  await store.delete(key);
}
