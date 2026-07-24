const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatMoney(amountCents: number, currency = "USD"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
  const dollars = (amountCents / 100).toFixed(0);
  return `${symbol}${dollars}`;
}

export function formatIntervalLabel(interval: "monthly" | "yearly"): string {
  return interval === "monthly" ? "/mo" : "/yr";
}
