/** Read-only: print active assignment/run scenario from Postgres (no secrets). */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const ASSIGN = "0198206f-5f53-7000-8000-000000000005";
const RUN = "0198206f-5f53-7000-8000-000000000006";

const a = await sql`
  select id, status, left(raw_request, 200) as req, contract
  from assignments where id = ${ASSIGN}::uuid
`;
const r = await sql`
  select id, status, event_seq from assignment_runs where id = ${RUN}::uuid
`;
const caps = await sql`
  select slug, status from capabilities
  where org_id = '0198206f-5f53-7000-8000-000000000001'::uuid
  order by slug
`;
const ev = await sql`
  select seq, type, left(summary, 120) as summary
  from run_events where run_id = ${RUN}::uuid
  order by seq
`;
const ms = await sql`
  select ordinal, title, status from milestones
  where run_id = ${RUN}::uuid order by ordinal
`;
const st = await sql`
  select ordinal, title, status from plan_steps
  where run_id = ${RUN}::uuid order by ordinal
`;
const gap = ev.filter(
  (e) =>
    String(e.summary).toLowerCase().includes("api") ||
    String(e.summary).toLowerCase().includes("checkout") ||
    String(e.type).includes("capability"),
);

console.log(
  JSON.stringify(
    {
      assignment: a,
      run: r,
      capabilities: caps,
      milestoneCount: ms.length,
      milestones: ms,
      stepCount: st.length,
      steps: st,
      eventCount: ev.length,
      capabilityEvents: gap,
      hasApiChangeText: JSON.stringify({ a, ev }).includes("api-change"),
      hasCheckoutAnalyzer: JSON.stringify({ a, ev, caps }).includes("checkout-error-log"),
    },
    null,
    2,
  ),
);
await sql.end();
