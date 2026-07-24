const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const base = "https://dextwork.com";
const assignment = "0198206f-5f53-7000-8000-000000000005";
const out = path.join(process.cwd(), "infra", "qa", "screenshots");
fs.mkdirSync(out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const cockpitUrl = `${base}/a/${assignment}`;
  const report = { assignment, stamp, shots: [] };

  for (const [w, h] of [[1920, 1080], [1440, 900]]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      extraHTTPHeaders: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    const page = await ctx.newPage();
    await page.goto(cockpitUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const html = await page.content();
    const shot = path.join(out, `bc-cockpit-${stamp}-${w}x${h}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.shots.push(shot);
    report[`${w}x${h}`] = {
      hasCheckout: /checkout-error-log-analyzer|Checkout error log analyzer|Broken Checkout|annual billing|annual plan|Priya/i.test(text + html),
      hasApiChange: /api-change-impact-analyzer|Webhook field rename|Install API change/i.test(text + html),
      hasDextworkShell: !!page.locator("[data-dextwork-shell]").count && (await page.locator("[data-dextwork-shell]").count()) > 0,
      hasDextworkSidebar:
        (await page.locator("[data-dextwork-sidebar]").count()) > 0 ||
        (await page.locator("[aria-label='Dextwork']").count()) > 0,
      bodySnip: text.slice(0, 280),
      bytes: fs.statSync(shot).size,
    };
    // also measure rail
    const rail = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("aside, nav, [data-dextwork-sidebar], [aria-label='Dextwork']"));
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), aria: el.getAttribute("aria-label"), data: el.getAttribute("data-dextwork-sidebar") };
      });
    });
    report[`${w}x${h}`].rail = rail;
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  const ok = Object.keys(report).filter(k=>k.includes("x")).every(k => report[k].hasCheckout && !report[k].hasApiChange);
  console.log("DATA_FIX_OK=" + ok);
  for (const s of report.shots) console.log("PATH " + s);
  process.exit(ok ? 0 : 2);
})().catch((e) => { console.error("FAIL " + e.message); process.exit(1); });
