const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const out = path.join(process.cwd(), "infra", "qa", "screenshots");
fs.mkdirSync(out, { recursive: true });
const base = process.env.QA_BASE_URL || "https://dextwork.com";
const assignment = "0198206f-5f53-7000-8000-000000000005";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const shots = [];
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
  ]) {
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();

    await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 60_000 });
    const home = path.join(out, `dextwork-home-${w}x${h}.png`);
    await page.screenshot({ path: home, fullPage: false });
    shots.push(home);

    await page.goto(`${base}/a/${assignment}`, { waitUntil: "networkidle", timeout: 60_000 });
    try {
      await page.getByLabel("Conversation").first().waitFor({ timeout: 15_000 });
    } catch {
      /* cockpit may still render without accessible names */
    }
    const cockpit = path.join(out, `dextwork-cockpit-${w}x${h}.png`);
    await page.screenshot({ path: cockpit, fullPage: false });
    shots.push(cockpit);

    await page.goto(`${base}/demo`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const demo = path.join(out, `dextwork-demo-${w}x${h}.png`);
    await page.screenshot({ path: demo, fullPage: false });
    shots.push(demo);

    await context.close();
  }
  await browser.close();
  for (const s of shots) {
    console.log(`SHOT ${s} bytes=${fs.statSync(s).size}`);
  }
  console.log(`SCREENSHOTS_OK=${shots.length}`);
})().catch((error) => {
  console.error(`SHOT_FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
