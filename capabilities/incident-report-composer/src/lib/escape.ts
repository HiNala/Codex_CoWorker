/**
 * Escape user-supplied content for safe embedding in markdown.
 * Strips raw HTML tags and neutralizes common markdown injection vectors.
 */
export function escapeUserContent(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/** Count words in a markdown fragment (rough, deterministic). */
export function wordCount(text: string): number {
  const cleaned = text
    .replace(/\[\\?\^[^\]]+\]/g, " ")
    .replace(/[#>*_`|\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter(Boolean).length;
}

/** Format microdollars as $X,XXX.XX for display (integer math, locale-independent). */
export function formatUsd(microdollars: number): string {
  const negative = microdollars < 0;
  const abs = Math.abs(microdollars);
  const dollars = Math.floor(abs / 1_000_000);
  const cents = Math.floor((abs % 1_000_000) / 10_000);
  const withCommas = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = `$${withCommas}.${cents.toString().padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}
