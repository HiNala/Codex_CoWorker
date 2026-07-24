export interface CommitInput {
  sha: string;
  message: string;
  author: string;
  files: string[];
}

export type Audience = "internal" | "customer";

export interface ReleaseNoteInput {
  commits: CommitInput[];
  previousTag: string;
  newTag: string;
  audience: Audience;
}

export type GroupKey = "breaking" | "features" | "fixes" | "internal";

export interface ReleaseNoteOutput {
  markdown: string;
  grouped: Record<GroupKey, string[]>;
  breakingChangeCount: number;
}

export interface ParsedCommit {
  sha: string;
  type: string;
  scope: string | null;
  breaking: boolean;
  subject: string;
  raw: string;
  group: GroupKey;
}
