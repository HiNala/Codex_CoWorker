"use client";

import { cn } from "@/lib/utils";

const NAV = [
  { id: "home", label: "Home", href: "/", glyph: "⌂" },
  { id: "runs", label: "Runs", href: "/a/0198206f-5f53-7000-8000-000000000005", glyph: "◎", active: true },
  { id: "outputs", label: "Outputs", href: "/outputs", glyph: "▦" },
  { id: "tools", label: "Tools", href: "#capabilities", glyph: "⬢" },
] as const;

/**
 * 76px icon rail — labels only as tooltips / aria-label (not full text nav).
 * Brand: Dextwork.
 */
export function DextworkSidebar({
  runTitle,
  runStatus,
}: {
  runTitle?: string;
  runStatus?: string;
}) {
  return (
    <aside className="cockpit-sidebar" aria-label="Dextwork">
      <div className="flex flex-col items-center border-b border-border/50 py-3">
        <a
          href="/"
          className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--ops-signal)] text-sm font-bold text-[color:var(--ops-ink)]"
          title="Dextwork"
          aria-label="Dextwork home"
        >
          D
        </a>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 py-3" aria-label="Primary">
        {NAV.map((item) => (
          <a
            key={item.id}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={"active" in item && item.active ? "page" : undefined}
            className={cn(
              "flex size-11 items-center justify-center rounded-xl text-muted-foreground",
              "hover:bg-[color:var(--ops-raised)] hover:text-foreground",
              "active" in item &&
                item.active &&
                "bg-[color:var(--ops-raised)] text-[color:var(--ops-signal)]",
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.glyph}
            </span>
          </a>
        ))}
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

      <div className="mt-auto border-t border-border/50 py-2">
        <a
          href="/settings"
          title="Settings"
          aria-label="Settings"
          className="mx-auto flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-[color:var(--ops-raised)] hover:text-foreground"
        >
          <span className="text-base leading-none" aria-hidden>
            ⚙
          </span>
        </a>
      </div>
    </aside>
  );
}
