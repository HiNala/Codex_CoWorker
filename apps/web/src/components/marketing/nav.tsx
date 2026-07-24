"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { DEMO_ASSIGNMENT_HREF } from "./constants";

const NAV_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#docs", label: "Docs" },
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Desktop — Linear-style full-width glass bar */}
      <header className="fixed inset-x-0 top-0 z-50 hidden border-b border-white/[0.06] bg-[#08090a]/80 backdrop-blur-xl md:block">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[3.75rem] max-w-6xl items-center justify-between gap-6 px-6 lg:px-12"
        >
          <div className="flex items-center gap-8">
            <BrandMark />
            <DesktopNavLinks pathname={pathname} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="h-8 rounded-md px-3 text-[0.8125rem] text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button
              asChild
              className="marketing-cta marketing-cta-primary h-8 rounded-md px-3.5 text-[0.8125rem]"
            >
              <Link href={DEMO_ASSIGNMENT_HREF}>Open the demo</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#08090a]/90 px-4 py-2.5 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="marketing-cta-primary h-8 rounded-md px-3 text-xs"
            >
              <Link href={DEMO_ASSIGNMENT_HREF}>Demo</Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-white/12 bg-transparent text-white hover:bg-white/[0.06]"
                  aria-label="Open menu"
                >
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(100%,20rem)] border-white/10 bg-[#0e0f11] text-white"
              >
                <SheetHeader>
                  <SheetTitle className="text-left text-sm font-semibold tracking-[0.12em] text-white">
                    FORGE
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile primary" className="mt-6 flex flex-col gap-0.5 px-1">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "rounded-md px-3 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white",
                          pathname === link.href && "bg-white/[0.06] text-white",
                        )}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      href={DEMO_ASSIGNMENT_HREF}
                      className="marketing-cta-primary mt-4 rounded-md px-3 py-2.5 text-center text-sm font-medium"
                    >
                      Open the demo
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

function DesktopNavLinks({ pathname }: { pathname: string }) {
  return (
    <ul className="flex items-center gap-0.5">
      {NAV_LINKS.filter((l) => l.href !== "/pricing").map((link) => {
        // Pricing lives elsewhere; filtered links are never /pricing
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[0.8125rem] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/90",
                active && "bg-white/[0.06] text-white",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
