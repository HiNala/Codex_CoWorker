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
  const report = { stamp, deploy: "4ef58f7b-819c-4101-98e5-a9d12916cec0", shots: [], attrs: {}, rails: [] };

  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      // bust caches
      extraHTTPHeaders: { "Cache-Control": "no-cache" },
    });
    const page = await ctx.newPage();

    await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 90_000 });
    const homePath = path.join(out, `prod-${stamp}-home-${w}x${h}.png`);
    await page.screenshot({ path: homePath, fullPage: false });
    report.shots.push(homePath);

    await page.goto(`${base}/a/${assignment}`, { waitUntil: "networkidle", timeout: 90_000 });
    // allow SSE/fixture paint
    await page.waitForTimeout(2500);

    const attrs = await page.evaluate(() => {
      const shell =
        document.querySelector("[data-dextwork-shell]") ||
        document.querySelector("[data-shell]") ||
        document.querySelector("main");
      const sidebar =
        document.querySelector("[data-dextwork-sidebar]") ||
        document.querySelector("[data-sidebar]") ||
        document.querySelector("[aria-label='Dextwork']") ||
        document.querySelector("aside");
      const all = Array.from(document.querySelectorAll("*"))
        .slice(0, 400)
        .flatMap((el) => Array.from(el.attributes || []).map((a) => a.name + "=" + a.value))
        .filter((s) => /dextwork|sidebar|rail|shell/i.test(s));
      return {
        hasDataDextworkShell: !!document.querySelector("[data-dextwork-shell]"),
        hasDataDextworkSidebar: !!document.querySelector("[data-dextwork-sidebar]"),
        hasAriaDextwork: !!document.querySelector("[aria-label='Dextwork'], [aria-label=\"Dextwork\"]"),
        shellAttrs: shell ? Array.from(shell.attributes).map((a) => `${a.name}=${a.value}`).slice(0, 20) : [],
        sidebarAttrs: sidebar
          ? Array.from(sidebar.attributes).map((a) => `${a.name}=${a.value}`).slice(0, 20)
          : [],
        matchingAttrs: all.slice(0, 40),
        bodyText: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 240),
      };
    });

    const rail = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll("aside, nav, [data-dextwork-sidebar], [data-rail], [class*='sidebar'], [class*='rail']"),
      );
      return els.slice(0, 15).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          w: Math.round(r.width),
          h: Math.round(r.height),
          aria: el.getAttribute("aria-label"),
          data: Array.from(el.attributes)
            .filter((a) => a.name.startsWith("data-"))
            .map((a) => a.name)
            .join(","),
          cls: String(el.className || "").slice(0, 100),
        };
      });
    });

    const cockpitPath = path.join(out, `prod-${stamp}-cockpit-${w}x${h}.png`);
    await page.screenshot({ path: cockpitPath, fullPage: false });
    report.shots.push(cockpitPath);
    report.attrs[`${w}x${h}`] = attrs;
    report.rails.push({ viewport: `${w}x${h}`, rail });

    const narrow = rail.find((r) => r.w >= 70 && r.w <= 90 && r.h > 300);
    report[`rail76_${w}x${h}`] = narrow || null;

    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  const anyShell = Object.values(report.attrs).some((a) => a.hasDataDextworkShell);
  const anySidebar = Object.values(report.attrs).some(
    (a) => a.hasDataDextworkSidebar || a.hasAriaDextwork,
  );
  const any76 = Object.keys(report).some((k) => k.startsWith("rail76_") && report[k]);
  console.log("HAS_DATA_DEXTWORK_SHELL=" + anyShell);
  console.log("HAS_DATA_DEXTWORK_SIDEBAR_OR_ARIA=" + anySidebar);
  console.log("HAS_76PX_RAIL=" + any76);
  console.log("SHOT_COUNT=" + report.shots.length);
  for (const s of report.shots) console.log("PATH " + s + " bytes=" + fs.statSync(s).size);
})().catch((e) => {
  console.error("FAIL " + e.message);
  process.exit(1);
});
