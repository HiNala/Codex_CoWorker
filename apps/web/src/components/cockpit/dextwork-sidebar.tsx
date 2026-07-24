"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEMO_ASSIGNMENT_RUN_MAP } from "@/hooks/resolve-stream-run-id";

const NAV = [
  { id: "home", label: "Home", href: "/home", match: (p: string) => p === "/home" || p === "/home/" },
  {
    id: "runs",
    label: "Runs",
    href: `/a/${DEMO_ASSIGNMENT_RUN_MAP.activeAssignment}`,
    match: (p: string) => p.startsWith("/a/"),
  },
  {
    id: "outputs",
    label: "Outputs",
    href: "/outputs",
    match: (p: string) => p.startsWith("/outputs"),
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

const GLYPH: Record<string, string> = {
  home: "⌂",
  runs: "◎",
  outputs: "▦",
  settings: "⚙",
};

/**
 * Universal 76px Dextwork icon rail — used by (app) layout on every product page.
 */
export function DextworkSidebar({
  runTitle,
  runStatus,
}: {
  runTitle?: string;
  runStatus?: string;
} = {}) {
  const pathname = usePathname() ?? "/home";

  return (
    <aside className="dextwork-rail" aria-label="Dextwork">
      <div className="flex flex-col items-center border-b border-border/50 py-3">
        <Link
          href="/home"
          className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--ops-signal)] text-sm font-bold text-[color:var(--ops-ink)]"
          title="Dextwork home"
          aria-label="Dextwork home"
        >
          D
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 py-3" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl text-muted-foreground",
                "hover:bg-[color:var(--ops-raised)] hover:text-foreground",
                active && "bg-[color:var(--ops-raised)] text-[color:var(--ops-signal)]",
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {GLYPH[item.id] ?? "·"}
              </span>
            </Link>
          );
        })}
      </nav>

      {(runTitle || runStatus) && (
        <div
          className="mx-1.5 mb-2 rounded-xl border border-border/60 bg-[color:var(--ops-raised)] p-1.5"
          title={[runTitle, runStatus?.replaceAll("_", " ")].filter(Boolean).join(" · ")}
        >
          <span
            className="mx-auto block size-2 rounded-full bg-[color:var(--ops-signal)]"
            aria-hidden
          />
          <span className="sr-only">
            Active run: {runTitle} {runStatus}
          </span>
        </div>
      )}
    </aside>
  );
}
