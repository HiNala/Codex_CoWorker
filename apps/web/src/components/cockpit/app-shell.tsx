import type { ReactNode } from "react";
import { navigationRegistry } from "@forge/ui";
import { cn } from "@/lib/utils";

/**
 * Application chrome: sidebar + main. Navigation entries come from
 * @forge/ui registry anchors — do not hardcode track-owned routes here.
 */
export function AppShell({
  children,
  coworkerName = "Nala",
  coworkerStatus = "working",
}: {
  children: ReactNode;
  coworkerName?: string;
  coworkerStatus?: string;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <aside
        className="fixed inset-y-0 start-0 z-30 hidden w-[272px] flex-col border-e border-border bg-card/80 backdrop-blur-xl lg:flex"
        aria-label="Primary"
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <a href="/" className="text-sm font-semibold tracking-tight">
            FORGE
          </a>
        </div>
        <div className="border-b border-border px-4 py-3">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-muted/30 px-3">
            <span
              className="size-2 rounded-full bg-[color:var(--status-active)]"
              aria-hidden
            />
            <span className="text-sm font-medium">{coworkerName}</span>
            <span className="ms-auto text-xs text-muted-foreground">{coworkerStatus}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-auto p-3" aria-label="App">
          {navigationRegistry.map((entry) => (
            <a
              key={entry.href}
              href={entry.href}
              className={cn(
                "flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
            >
              {entry.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          demo@forge.dev
        </div>
      </aside>
      <div className="lg:ps-[272px]">
        <main id="main" className="min-h-dvh">
          {children}
        </main>
      </div>
    </div>
  );
}
