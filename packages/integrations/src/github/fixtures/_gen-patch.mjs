import { mkdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixturesDir = fileURLToPath(new URL(".", import.meta.url));
const root = join(fixturesDir, "../../../../../");
const demoCheckout = join(root, "demo/acme-store/src/checkout");

const pricesFixed = `/**
 * Stripe Price IDs for each plan × billing cadence.
 * Keys are composed as \`\${plan}_\${interval}\`.
 * Interval vocabulary is shared with the pricing page toggle: monthly | yearly.
 */
export type BillingInterval = "monthly" | "yearly";

export const PRICE_IDS = {
  starter_monthly: "price_1QxStarterM",
  starter_yearly: "price_1QxStarterA",
  team_monthly: "price_1QxTeamM",
  team_yearly: "price_1QxTeamA",
  scale_monthly: "price_1QxScaleM",
  scale_yearly: "price_1QxScaleA",
} as const;

export type PriceKey = keyof typeof PRICE_IDS;

export type ResolvePriceResult =
  | { ok: true; priceId: string }
  | { ok: false; reason: "unknown_plan" | "unknown_interval" };

export function resolvePriceId(plan: string, interval: string): string | undefined {
  const result = resolvePrice(plan, interval);
  return result.ok ? result.priceId : undefined;
}

/** Typed lookup used by the checkout route - never returns a silent miss. */
export function resolvePrice(plan: string, interval: string): ResolvePriceResult {
  if (!isKnownPlan(plan)) {
    return { ok: false, reason: "unknown_plan" };
  }
  if (interval !== "monthly" && interval !== "yearly") {
    return { ok: false, reason: "unknown_interval" };
  }
  const key = \`\${plan}_\${interval}\` as PriceKey;
  const priceId = PRICE_IDS[key];
  if (!priceId) {
    return { ok: false, reason: "unknown_interval" };
  }
  return { ok: true, priceId };
}

export function isKnownPlan(plan: string): plan is "starter" | "team" | "scale" {
  return plan === "starter" || plan === "team" || plan === "scale";
}
`;

const testsFixed = `import { describe, expect, it } from "vitest";
import { isKnownPlan, PRICE_IDS, resolvePrice, resolvePriceId } from "./prices";

describe("resolvePriceId", () => {
  it("resolves starter monthly", () => {
    expect(resolvePriceId("starter", "monthly")).toBe(PRICE_IDS.starter_monthly);
  });

  it("resolves team monthly", () => {
    expect(resolvePriceId("team", "monthly")).toBe(PRICE_IDS.team_monthly);
  });

  it("resolves scale monthly", () => {
    expect(resolvePriceId("scale", "monthly")).toBe(PRICE_IDS.scale_monthly);
  });

  it("resolves annual plans under the yearly key", () => {
    expect(resolvePriceId("starter", "yearly")).toBe(PRICE_IDS.starter_yearly);
    expect(resolvePriceId("team", "yearly")).toBe(PRICE_IDS.team_yearly);
    expect(resolvePriceId("scale", "yearly")).toBe(PRICE_IDS.scale_yearly);
  });

  it("returns undefined for unknown plan", () => {
    expect(resolvePriceId("enterprise", "monthly")).toBeUndefined();
  });

  it("returns undefined for empty interval", () => {
    expect(resolvePriceId("team", "")).toBeUndefined();
  });

  it("validates known plans", () => {
    expect(isKnownPlan("team")).toBe(true);
    expect(isKnownPlan("hobby")).toBe(false);
  });
});

describe("resolvePrice", () => {
  it("returns ok for team yearly", () => {
    expect(resolvePrice("team", "yearly")).toEqual({
      ok: true,
      priceId: PRICE_IDS.team_yearly,
    });
  });

  it("returns typed unknown_interval for annual (legacy key)", () => {
    expect(resolvePrice("team", "annual")).toEqual({
      ok: false,
      reason: "unknown_interval",
    });
  });
});
`;

function toLf(s) {
  const n = s.replace(/\r\n/g, "\n");
  return n.endsWith("\n") ? n : `${n}\n`;
}

const tmp = mkdtempSync(join(tmpdir(), "forge-patch-"));
mkdirSync(join(tmp, "src/checkout"), { recursive: true });

const origPrices = readFileSync(join(demoCheckout, "prices.ts"), "utf8");
const origTests = readFileSync(join(demoCheckout, "prices.test.ts"), "utf8");
writeFileSync(join(tmp, "src/checkout/prices.ts"), toLf(origPrices));
writeFileSync(join(tmp, "src/checkout/prices.test.ts"), toLf(origTests));

const git = (args) =>
  execFileSync("git", args, { cwd: tmp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

git(["init"]);
git(["config", "core.autocrlf", "false"]);
git(["add", "src/checkout/prices.ts", "src/checkout/prices.test.ts"]);
git(["-c", "user.email=forge@local", "-c", "user.name=FORGE", "commit", "-m", "base"]);

writeFileSync(join(tmp, "src/checkout/prices.ts"), toLf(pricesFixed));
writeFileSync(join(tmp, "src/checkout/prices.test.ts"), toLf(testsFixed));

const patch = git(["diff", "--no-color", "--", "src/checkout/prices.ts", "src/checkout/prices.test.ts"]);
const patchPath = join(fixturesDir, "annual-checkout-fix.patch");
writeFileSync(patchPath, patch);

git(["checkout", "--", "."]);
git(["apply", "--3way", patchPath]);
console.log("wrote", patchPath);
console.log("bytes", Buffer.byteLength(patch));
console.log("apply ok");

rmSync(tmp, { recursive: true, force: true });
