import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-full px-2 py-1 text-white outline-offset-4",
        className,
      )}
      aria-label="FORGE home"
    >
      <span className="grid size-8 place-items-center rounded-full border border-white/20 bg-white/10 text-[11px] font-bold tracking-[-0.08em] text-white">
        FG
      </span>
      {!compact ? (
        <span className="pr-1 text-sm font-semibold tracking-[0.16em]">FORGE</span>
      ) : null}
    </Link>
  );
}
