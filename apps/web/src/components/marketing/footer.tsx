import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#security", label: "Security" },
  { href: "/#docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#terms", label: "Terms" },
  { href: "/#privacy", label: "Privacy" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="marketing-shell flex flex-col gap-6 py-12">
        <p className="text-sm font-semibold tracking-[0.18em]">FORGE</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          The coworker that builds its own tools — and leaves finished work behind.
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground focus-visible:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} FORGE. Work Credits are an internal product balance — not
          provider credits.
        </p>
      </div>
    </footer>
  );
}

