const {spawnSync, createRequire}=require("child_process");
const { createRequire: cr } = require("module");
const req = cr(process.cwd() + "/packages/db/package.json");
const postgres = req("postgres");
const { chromium } = require(process.cwd() + "/node_modules/@playwright/test");
const fs = require("fs");
const path = require("path");
const {spawnSync: sp} = require("child_process");

const vars=JSON.parse(sp("railway variables --service Postgres --json",{shell:true,encoding:"utf8"}).stdout);
const o=vars.variables||vars;
const url=o.DATABASE_PUBLIC_URL;
if(!url){console.log("DATABASE_PUBLIC_URL=UNSET");process.exit(1);}
console.log("DATABASE_PUBLIC_URL=CONFIGURED");

(async()=>{
  const sql = postgres(url, { max: 1, ssl: "require" });
  try {
    const rows = await sql`
      select id, left(raw_request, 160) as raw_preview, status, source
      from assignments
      where id = '0198206f-5f53-7000-8000-000000000005'
    `;
    const r = rows[0];
    console.log("ASSIGNMENT_ID=" + (r&&r.id));
    console.log("ASSIGNMENT_STATUS=" + (r&&r.status));
    console.log("RAW_PREVIEW=" + (r&&r.raw_preview));
    const raw = (r&&r.raw_preview)||"";
    console.log("HAS_ANNUAL_CHECKOUT=" + /annual plan|annual billing|checkout/i.test(raw));
    console.log("HAS_WEBHOOK_RENAME=" + /webhook field rename/i.test(raw));
    console.log("HAS_API_CHANGE=" + /api.change.impact/i.test(raw));

    const events = await sql`
      select count(*)::int as n from run_events where run_id = '0198206f-5f53-7000-8000-000000000006'
    `;
    console.log("ACTIVE_RUN_EVENT_COUNT=" + events[0].n);

    const steps = await sql`
      select title from plan_steps where run_id = '0198206f-5f53-7000-8000-000000000006' order by ordinal
    `;
    console.log("PLAN_STEPS=" + steps.map(s=>s.title).join(" | "));
    console.log("HAS_CHECKOUT_ANALYZER_STEP=" + steps.some(s=>/checkout-error-log-analyzer|checkout error log/i.test(s.title)));

    const caps = await sql`
      select slug, status from capabilities where org_id = '0198206f-5f53-7000-8000-000000000001' order by slug
    `;
    console.log("CAP_SLUGS=" + caps.map(c=>c.slug+":"+c.status).join(","));
    console.log("HAS_API_CHANGE_CAP=" + caps.some(c=>c.slug==="api-change-impact-analyzer"));
  } finally {
    await sql.end({ timeout: 2 });
  }

  const web=JSON.parse(sp("railway variables --service web --json",{shell:true,encoding:"utf8"}).stdout).variables
    ||JSON.parse(sp("railway variables --service web --json",{shell:true,encoding:"utf8"}).stdout);
  const code=web.DEMO_ACCESS_CODE;
  console.log("DEMO_ACCESS_CODE="+(code?"CONFIGURED":"UNSET"));
  for (const p of ["/api/demo/reset","/api/demo/seed","/api/demo/replay"]) {
    const res=await fetch("https://dextwork.com"+p,{method:"POST",headers:{"content-type":"application/json","x-demo-access-code":code},body:JSON.stringify({accessCode:code})});
    console.log("API "+p+" STATUS="+res.status);
  }

  const out=path.join(process.cwd(),"infra","qa","screenshots");
  fs.mkdirSync(out,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);
  const browser=await chromium.launch({headless:true});
  const page=await (await browser.newContext({viewport:{width:1920,height:1080},extraHTTPHeaders:{"Cache-Control":"no-cache"}})).newPage();
  const cockpitUrl="https://dextwork.com/a/0198206f-5f53-7000-8000-000000000005";
  await page.goto(cockpitUrl,{waitUntil:"networkidle",timeout:90000});
  await page.waitForTimeout(3500);
  const text=(await page.locator("body").innerText()).replace(/\s+/g," ");
  const html=await page.content();
  const shot=path.join(out,`prod-broken-checkout-${stamp}-1920x1080.png`);
  await page.screenshot({path:shot,fullPage:false});
  // also 1440
  const page2=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
  await page2.goto(cockpitUrl,{waitUntil:"networkidle",timeout:90000});
  await page2.waitForTimeout(2500);
  const shot2=path.join(out,`prod-broken-checkout-${stamp}-1440x900.png`);
  await page2.screenshot({path:shot2,fullPage:false});
  await browser.close();

  console.log("COCKPIT_URL="+cockpitUrl);
  console.log("BODY_SNIP="+text.slice(0,350));
  console.log("UI_HAS_CHECKOUT_ANALYZER="+(/checkout-error-log-analyzer|Checkout error log analyzer|Broken Checkout|annual billing|annual plan/i.test(text+html)));
  console.log("UI_HAS_API_CHANGE="+(/api-change-impact-analyzer|Webhook field rename|API change impact/i.test(text+html)));
  console.log("UI_HAS_DEXTWORK="+(/data-dextwork-shell|data-dextwork-sidebar|aria-label=.Dextwork/i.test(html)));
  console.log("SCREENSHOT_1920="+shot);
  console.log("SCREENSHOT_1440="+shot2);
  const ok = /checkout-error-log-analyzer|Broken Checkout|annual/i.test(text+html) && !/Webhook field rename/i.test(text+html);
  console.log("DATA_FIX_OK="+ok);
  process.exit(ok?0:2);
})().catch(e=>{console.error("FAIL "+e.message);process.exit(1);});
