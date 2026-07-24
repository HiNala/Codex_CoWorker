import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAllFixtureCases } from "../src/run-fixture";
import type { ApiChangeImpactCase } from "../src/types";
import { naiveAnalyze } from "./naive-impl";
import { referenceAnalyze } from "./reference-impl";

const casesDir = join(dirname(fileURLToPath(import.meta.url)), "cases");

export function loadCaseFiles(): Array<{ name: string; fixture: ApiChangeImpactCase }> {
  const files = readdirSync(casesDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return files.map((file) => {
    const raw = readFileSync(join(casesDir, file), "utf8");
    const fixture = JSON.parse(raw) as ApiChangeImpactCase;
    return { name: file.replace(/\.json$/, ""), fixture };
  });
}

export async function runAgainst(
  execute: typeof referenceAnalyze,
): Promise<Awaited<ReturnType<typeof runAllFixtureCases>>> {
  return runAllFixtureCases(loadCaseFiles(), execute);
}

/** CLI: print reference + naive pass/fail summary. */
export async function main(): Promise<void> {
  const cases = loadCaseFiles();
  console.log(`Loaded ${cases.length} cases from ${casesDir}`);

  const ref = await runAllFixtureCases(cases, referenceAnalyze);
  const naive = await runAllFixtureCases(cases, naiveAnalyze);

  console.log("\nreference-impl:");
  for (const r of ref) {
    console.log(`  ${r.passed ? "PASS" : "FAIL"}  ${r.name} — ${r.description}`);
    if (!r.passed && r.diff) console.log(`         ${r.diff}`);
  }

  console.log("\nnaive-impl:");
  for (const r of naive) {
    console.log(`  ${r.passed ? "PASS" : "FAIL"}  ${r.name} — ${r.description}`);
    if (!r.passed && r.diff) console.log(`         ${r.diff}`);
  }

  const refAll = ref.every((r) => r.passed);
  const naive003 = naive.find((r) => r.name === "003-nested-rename");
  const naiveOthersPass = naive
    .filter((r) => r.name !== "003-nested-rename")
    .every((r) => r.passed);

  if (!refAll) {
    console.error("\nreference must pass all cases");
    process.exitCode = 1;
  }
  if (!naive003 || naive003.passed) {
    console.error("\nnaive must FAIL 003-nested-rename");
    process.exitCode = 1;
  }
  if (!naiveOthersPass) {
    console.error("\nnaive must pass all cases except 003");
    process.exitCode = 1;
  }
  if (refAll && naive003 && !naive003.passed && naiveOthersPass) {
    console.log("\nOK — reference passes all; naive fails only 003");
  }
}

const entry = process.argv[1]?.replaceAll("\\", "/");
if (
  entry?.endsWith("/api-change-impact-analyzer/run.ts") ||
  entry?.endsWith("/api-change-impact-analyzer/run.js")
) {
  void main();
}
