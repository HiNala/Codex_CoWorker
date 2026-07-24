import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStore } from "@forge/contracts";
import type { StorageEnv } from "@forge/config";

export class S3ObjectStore implements ObjectStore {
  readonly #client: S3Client;
  readonly #bucket: string;

  constructor(environment: StorageEnv) {
    this.#bucket = environment.S3_BUCKET;
    this.#client = new S3Client({
      endpoint: environment.S3_ENDPOINT,
      region: environment.S3_REGION,
      forcePathStyle: environment.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: environment.S3_ACCESS_KEY,
        secretAccessKey: environment.S3_SECRET_KEY,
      },
    });
  }

  async put(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<{ sha256: string }> {
    const buffer = Buffer.from(body);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: { sha256 },
      }),
    );
    return { sha256 };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.#client.send(
      new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Object body is empty: ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async head(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const response = await this.#client.send(
        new HeadObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? "application/octet-stream",
      };
    } catch (error) {
      if (error instanceof Error && ["NotFound", "NoSuchKey"].includes(error.name)) {
        return null;
      }
      if (error instanceof Error && error.name === "NoSuchBucket") throw error;
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }

  async downloadUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(this.#client, new GetObjectCommand({ Bucket: this.#bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  async uploadUrl(key: string, ttlSeconds: number, contentType: string): Promise<string> {
    return getSignedUrl(
      this.#client,
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: ttlSeconds },
    );
  }
}
