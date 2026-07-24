import { cn } from "../cn";

export type EvidenceTrust = "official" | "secondary" | "untrusted";

export interface EvidenceChipProps {
  domain: string;
  title: string;
  retrievedAt: string;
  trust: EvidenceTrust;
  onOpen?: () => void;
  className?: string;
}

const TRUST_META: Record<EvidenceTrust, { label: string; token: string }> = {
  official: { label: "Official", token: "evidence-official" },
  secondary: { label: "Secondary", token: "evidence-secondary" },
  untrusted: { label: "Untrusted", token: "evidence-untrusted" },
};

function monogram(domain: string): string {
  const host = domain.replace(/^www\./, "");
  const parts = host.split(".");
  const name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return (name?.slice(0, 2) ?? "??").toUpperCase();
}

export function EvidenceChip({
  domain,
  title,
  retrievedAt,
  trust,
  onOpen,
  className,
}: EvidenceChipProps) {
  const trustMeta = TRUST_META[trust];
  const mono = monogram(domain);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group inline-flex max-w-full min-h-11 items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/50",
        className,
      )}
      aria-label={`${title} from ${domain}, ${trustMeta.label}`}
    >
      <span
        className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-card font-mono text-[10px] font-semibold"
        style={{ color: `var(--${trustMeta.token})` }}
        aria-hidden
      >
        {mono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm group-hover:underline">{title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{domain}</span>
          <span className="shrink-0 tabular-nums">{formatRelative(retrievedAt)}</span>
          <span className="shrink-0" style={{ color: `var(--${trustMeta.token})` }}>
            {trustMeta.label}
          </span>
        </span>
      </span>
    </button>
  );
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
