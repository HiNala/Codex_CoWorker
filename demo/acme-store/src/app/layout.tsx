import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acme Payments — Pricing",
  description: "Plans and checkout for Acme Payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container site-header">
          <div className="brand">
            Acme Payments <span>/ store</span>
          </div>
          <nav>
            <a href="/pricing">Pricing</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
