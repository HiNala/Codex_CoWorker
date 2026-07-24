import { createHash } from "node:crypto";
import type { ObjectStore } from "@forge/contracts";

interface StoredValue {
  body: Buffer;
  contentType: string;
}

export class FakeObjectStore implements ObjectStore {
  readonly #objects = new Map<string, StoredValue>();

  async put(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<{ sha256: string }> {
    const buffer = Buffer.from(body);
    this.#objects.set(key, { body: buffer, contentType });
    return { sha256: createHash("sha256").update(buffer).digest("hex") };
  }

  async get(key: string): Promise<Buffer> {
    const value = this.#objects.get(key);
    if (!value) throw new Error(`Object not found: ${key}`);
    return Buffer.from(value.body);
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    const value = this.#objects.get(key);
    return value ? { size: value.body.byteLength, contentType: value.contentType } : null;
  }

  async delete(key: string): Promise<void> {
    this.#objects.delete(key);
  }

  async downloadUrl(key: string, ttlSeconds: number): Promise<string> {
    if (!this.#objects.has(key)) throw new Error(`Object not found: ${key}`);
    return `memory://download/${encodeURIComponent(key)}?ttl=${ttlSeconds}`;
  }

  async uploadUrl(key: string, ttlSeconds: number, contentType: string): Promise<string> {
    return `memory://upload/${encodeURIComponent(key)}?ttl=${ttlSeconds}&type=${encodeURIComponent(contentType)}`;
  }
}
