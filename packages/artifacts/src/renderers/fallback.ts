/**
 * Safe metadata-and-download fallback for unknown or unregistered artifact types.
 * Never throws; never attempts to interpret content as HTML or executable data.
 */

export type FallbackInput = {
  id?: string;
  type: string;
  title: string;
  status?: string;
  versionLabel?: string;
  /** Opaque content format hint (markdown | json | diff | binary). */
  contentFormat?: string;
  /** Optional pre-signed download URL (never logged; passed through only). */
  downloadUrl?: string;
  /** Byte size of the underlying object, if known. */
  sizeBytes?: number;
  sha256?: string;
};

export type FallbackRenderModel = {
  title: string;
  type: string;
  status: string | null;
  versionLabel: string | null;
  contentFormat: string | null;
  downloadUrl: string | null;
  sizeLabel: string | null;
  sha256Truncated: string | null;
  notice: string;
  canDownload: boolean;
};

export type FallbackMetrics = {
  label: string;
};

export function buildFallbackModel(input: FallbackInput): FallbackRenderModel {
  const sha = input.sha256?.trim();
  return {
    title: input.title || "Untitled artifact",
    type: input.type || "unknown",
    status: input.status ?? null,
    versionLabel: input.versionLabel ?? null,
    contentFormat: input.contentFormat ?? null,
    downloadUrl: input.downloadUrl ?? null,
    sizeLabel: formatBytes(input.sizeBytes),
    sha256Truncated: sha ? truncateHash(sha) : null,
    notice:
      "This artifact type has no specialized renderer. Metadata is shown below; download the original content if available.",
    canDownload: Boolean(input.downloadUrl),
  };
}

export function fallbackMetrics(input: FallbackInput): FallbackMetrics {
  return {
    label: input.type || "unknown",
  };
}

function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

function formatBytes(size: number | undefined): string | null {
  if (size === undefined || !Number.isFinite(size) || size < 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
