/**
 * View-model types for artifact UI. Kept local so the web app does not need a
 * package dependency on @forge/artifacts pure renderers.
 */

export type ArtifactTypeKey =
  | "document.markdown"
  | "table.typed"
  | "code.change"
  | "capability.package"
  | "receipt.assignment"
  | (string & {});

export type ArtifactStatusKey =
  | "declared"
  | "drafting"
  | "ready_for_review"
  | "approved"
  | "delivered"
  | "published"
  | "superseded"
  | "archived"
  | "blocked"
  | "failed"
  | "rejected"
  | "withdrawn"
  | (string & {});

export type ArtifactCardMetrics = {
  /** Preformatted metric chips, e.g. "3 sections", "2 sources", "v3". */
  chips: string[];
};

export type ArtifactCardViewModel = {
  id: string;
  type: ArtifactTypeKey;
  title: string;
  status: ArtifactStatusKey;
  versionLabel?: string;
  metrics?: ArtifactCardMetrics;
};

export type EvidenceViewModel = {
  id: string;
  sourceUrl: string | null;
  title: string;
  excerpt: string;
  contentSha256: string;
  retrievedAt: string;
  trust: "official" | "secondary" | "user_supplied" | "untrusted" | (string & {});
  /** Optional span within excerpt to highlight. */
  highlight?: string;
  injectionSuspected?: boolean;
};

export type TypedTableColumnVM = {
  id: string;
  name: string;
  type: string;
};

export type TypedTableRowVM = {
  rowId: string;
  cells: Record<string, unknown>;
  evidenceRefs?: string[];
};

export type TypedTableContentVM = {
  columns: TypedTableColumnVM[];
  rows: TypedTableRowVM[];
  warnings?: Array<{ rowId?: string; message: string }>;
};

export type CodeChangeFileVM = {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
};

export type CodeChangeContentVM = {
  repo: string;
  baseRevision: string;
  branch: string;
  files: CodeChangeFileVM[];
  testResults?: { passed: number; failed: number; total: number; label?: string };
  prUrl?: string;
};

export type ArtifactCanvasModel = {
  id: string;
  type: ArtifactTypeKey;
  title: string;
  status: ArtifactStatusKey;
  versionLabel?: string;
  versions?: Array<{ id: string; label: string }>;
  currentVersionId?: string;
  /** Type-specific payload. */
  content?: unknown;
  contentFormat?: "markdown" | "json" | "diff" | string;
  downloadUrl?: string;
  sha256?: string;
  evidence?: EvidenceViewModel[];
};

export type ArtifactRendererProps = {
  artifact: ArtifactCanvasModel;
  onEvidenceSelect?: (evidenceIds: string[]) => void;
  onExport?: () => void;
  onApprove?: () => void;
};
