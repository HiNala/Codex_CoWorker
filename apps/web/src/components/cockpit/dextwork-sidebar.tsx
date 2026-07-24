"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DEMO_ASSIGNMENT_RUN_MAP } from "@/hooks/resolve-stream-run-id";

const NAV = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") || p === "/home",
  },
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

/** Universal 76px icon rail — one instance in (app)/layout only. */
export function DextworkSidebar() {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <aside className="dextwork-rail" aria-label="Dextwork">
      <div className="flex flex-col items-center border-b border-border py-3">
        <Link
          href="/dashboard"
          className="flex size-10 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background"
          title="Dashboard"
          aria-label="Dextwork dashboard"
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
                "hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground ring-1 ring-border",
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {GLYPH[item.id] ?? "·"}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
