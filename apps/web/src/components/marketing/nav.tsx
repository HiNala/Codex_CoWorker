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
      {/* Desktop floating pill */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 top-5 z-50 mx-auto hidden w-fit items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1.5 text-white shadow-2xl backdrop-blur-xl md:flex"
      >
        <BrandMark />
        <DesktopNavLinks pathname={pathname} />
        <Button asChild className="marketing-cta ms-1 bg-primary text-primary-foreground">
          <Link href={DEMO_ASSIGNMENT_HREF}>Open the demo</Link>
        </Button>
      </nav>

      {/* Mobile accessible nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full px-3">
              <Link href={DEMO_ASSIGNMENT_HREF}>Demo</Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 bg-white/5 text-white"
                  aria-label="Open menu"
                >
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)] border-border bg-card">
                <SheetHeader>
                  <SheetTitle className="text-left tracking-[0.14em]">FORGE</SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile primary" className="mt-6 flex flex-col gap-1 px-2">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted",
                          pathname === link.href && "bg-muted",
                        )}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      href={DEMO_ASSIGNMENT_HREF}
                      className="mt-4 rounded-full bg-primary px-3 py-3 text-center text-sm font-semibold text-primary-foreground"
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
    <ul className="flex items-center gap-0.5 px-1">
      {NAV_LINKS.map((link) => {
        const active = link.href === "/pricing" && pathname.startsWith("/pricing");
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white",
                active && "bg-white/10 text-white",
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
