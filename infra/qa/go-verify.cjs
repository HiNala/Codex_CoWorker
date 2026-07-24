const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const base = "https://dextwork.com";
const out = path.join(process.cwd(), "infra", "qa", "screenshots");
fs.mkdirSync(out, { recursive: true });

function scoreLayout(html) {
  const h = html.toLowerCase();
  const signals = {
    iconRail76: /76px|w-\[76px\]|width:\s*76px|icon.?rail|data-rail|sidebar.*76/i.test(html),
    dextworkBrand: /dextwork/i.test(html),
    foundry: /foundry|mission control|conversation|artifact/i.test(html),
    oldTwoCol: /grid-cols-\[1fr_1fr\]|two-column|old-shell/i.test(html),
    // structural class hints from Aria layout
    clampPanel: /clamp\(480px|38vw|minmax\(560px/i.test(html),
    tooltipsRail: /tooltip|icon-rail|nav-rail/i.test(html),
  };
  return signals;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [w, h] of [[1920, 1080], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "networkidle", timeout: 90000 });
    const homeHtml = await page.content();
    const homePath = path.join(out, `go-home-${w}x${h}.png`);
    await page.screenshot({ path: homePath, fullPage: false });
    results.push({ page: "home", w, h, path: homePath, signals: scoreLayout(homeHtml), bytes: fs.statSync(homePath).size });

    await page.goto(base + "/a/0198206f-5f53-7000-8000-000000000005", { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1500);
    const cockpitHtml = await page.content();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    // measure leftmost rail width if present
    const railInfo = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("aside, nav, [data-rail], [class*='rail'], [class*='sidebar']"));
      const dims = candidates.slice(0, 12).map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height), cls: (el.className || "").toString().slice(0, 80) };
      });
      const narrow = dims.filter((d) => d.w >= 60 && d.w <= 100 && d.h > 200);
      return { dims, narrowRail: narrow[0] || null, bodyW: document.body.clientWidth };
    });
    const cockpitPath = path.join(out, `go-cockpit-${w}x${h}.png`);
    await page.screenshot({ path: cockpitPath, fullPage: false });
    const signals = scoreLayout(cockpitHtml + bodyText);
    results.push({
      page: "cockpit",
      w,
      h,
      path: cockpitPath,
      bytes: fs.statSync(cockpitPath).size,
      signals,
      railInfo,
      bodySnippet: bodyText.replace(/\s+/g, " ").slice(0, 200),
    });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify({ results }, null, 2));
  // Heuristic: new layout if we find ~76px rail
  const has76 = results.some((r) => r.railInfo && r.railInfo.narrowRail && r.railInfo.narrowRail.w >= 70 && r.railInfo.narrowRail.w <= 90);
  const hasClamp = results.some((r) => r.signals && r.signals.clampPanel);
  console.log("LAYOUT_76PX_RAIL=" + has76);
  console.log("LAYOUT_CLAMP_HINT=" + hasClamp);
  console.log("LAYOUT_NEW_SHELL=" + (has76 || hasClamp));
})().catch((e) => { console.error("SHOT_FAIL " + e.message); process.exit(1); });
