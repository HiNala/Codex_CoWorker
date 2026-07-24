# Interface announcements

Frozen interfaces are defined in `packages/contracts`.

---

## Track A → Track D — Run event SSE contract (Cael → Aria)

**Authority:** Cael (worker + `@forge/events`). **Aria owns** `apps/web` proxy/hook only.  
**Do not implement against source — implement against this section.**  
**Seeded demo runId:** `0198206f-5f53-7000-8000-000000000006`  
**Local worker base (default):** `http://127.0.0.1:3001`  
**Prod base:** value of env `WORKER_PUBLIC_URL` (path unchanged).

### 1. Endpoint

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/runs/:runId/stream` |
| Full local example | `GET http://127.0.0.1:3001/runs/0198206f-5f53-7000-8000-000000000006/stream?after=0` |
| Success response | `200` |
| Content-Type | `text/event-stream; charset=utf-8` |
| Other headers | `cache-control: no-cache, no-transform` · `connection: keep-alive` · `x-accel-buffering: no` |

`:runId` is a UUID string (seeded assignment run for Broken Checkout is above).

### 2. Resume-after-sequence (cursor)

| Source | Name | Priority |
|--------|------|----------|
| HTTP header | `Last-Event-ID` | **Highest** (used when present) |
| Query parameter | `after` | Used when header absent |
| Default | `0` | When neither present |

**Semantics — EXCLUSIVE of the given sequence:**

- Cursor value `N` means: return/send every event with **`seq > N`**.
- Events with `seq === N` are **not** re-sent.
- After a successful frame with SSE `id: 12`, the client’s next resume should use `Last-Event-ID: 12` or `?after=12` to continue with `seq > 12`.
- `after=0` (or missing) means “from the beginning” (all persisted `seq >= 1`).

Invalid non-integer / negative values fall back to `0`.

### 3. SSE event names

Exactly two event types are emitted on this stream:

| `event:` name | When |
|---------------|------|
| `run.event` | One frame per user-visible `RunEvent` (backfill and live) |
| `heartbeat` | Keepalive while the connection is open |

No other event names are emitted by this stream.

**Visibility filter:** events with `visibility === "internal"` are **never** sent. Default stored events are `user`.

### 4. Frame layout and sequence cursor

#### 4.1 `run.event` frame (exact wire format)

```
id: <seq>
event: run.event
data: <JSON>
```

- **`id:`** is the decimal integer **`seq`** of that event (not the UUID). Browser `EventSource` stores this and resends it as `Last-Event-ID` on reconnect.
- **`data:`** is a single JSON object (one line). No multi-line data fields.

#### 4.2 `data` JSON shape for `run.event` (`RunEvent`)

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | `string` (UUID) | yes | Event row id |
| `seq` | `number` (int, **positive**) | yes | Per-run sequence; gapless 1..N for a complete seeded run |
| `runId` | `string` (UUID) | yes | |
| `assignmentId` | `string` (UUID) | yes | |
| `orgId` | `string` (UUID) | yes | |
| `ts` | `string` (ISO-8601 datetime) | yes | |
| `type` | `string` | yes | `RunEventType` enum value (e.g. `step.completed`, `capability.gate_failed`) |
| `channel` | `string` | yes | One of: `narrative` \| `trace` \| `plan` \| `capability` \| `artifact` \| `approval` \| `cost` \| `system` |
| `level` | `string` | yes | `info` \| `warn` \| `error` (default `info`) |
| `visibility` | `string` | yes | `user` \| `audit` \| `internal` (stream only sends non-`internal`) |
| `summary` | `string` | yes | 1–280 chars, user-safe sentence |
| `detail` | `unknown` | no | Opaque JSON; type-specific (e.g. gate failure `{ message, received, expected }`) |
| `refs` | `object` | yes | May be `{}`. Optional keys: `stepId`, `milestoneId`, `capabilityId`, `capabilityVersionId`, `artifactId`, `artifactVersionId`, `approvalId`, `evidenceIds` (string[]), `externalActionId` — all UUIDs when present |
| `cost` | `object` | no | `{ microcredits: number, provider: "openai"\|"codex"\|"octen"\|"composio"\|"sandbox"\|"storage", units: Record<string, number> }` |

Client cursor: after processing a `run.event`, set cursor to `data.seq` (or the SSE `id` field — same value).

#### 4.3 `heartbeat` frame

```
event: heartbeat
data: {"ts":"<ISO-8601>","seq":<number>}
```

| Field | Type | Meaning |
|-------|------|---------|
| `ts` | string | Server time when heartbeat was emitted |
| `seq` | number | Highest `run.event` seq observed so far on this connection (or the resume cursor if no events yet) |

Heartbeats have **no** `id:` field. Do **not** advance the client cursor from a heartbeat.

### 5. Backfill vs live-tail

There is **no** separate “backfill-complete” event and **no** different payload shape for live vs historical.

Behaviour of a single connection:

1. Server reads resume cursor `N` (`Last-Event-ID` or `after`, exclusive).
2. **Backfill:** all stored events with `seq > N` are sent as `run.event` frames (ordered ascending by `seq`).
3. **Live-tail:** without closing the stream, the same connection then continues sending new `run.event` frames as they are published (same format).
4. Events arriving during backfill are buffered and de-duplicated by `seq` so the client never sees the same `seq` twice on one connection.

Client cannot distinguish backfill frames from live frames except by timing; both are `event: run.event` with the same JSON schema.

### 6. Heartbeat / keepalive

| Item | Value |
|------|--------|
| Interval | **15_000 ms** (15 seconds) |
| Event name | `heartbeat` |
| Continues after run finishes? | **Yes** — stream does not auto-close on `run.completed` |

### 7. Terminal / close semantics

- **There is no terminal SSE frame** when a run finishes. A `run.event` with `type: "run.completed"` (or `run.failed` / `run.cancelled`) is a normal data event; the HTTP stream **stays open**.
- Connection closes when:
  - The **client** aborts/disconnects, or
  - The server hits an error during stream setup/backfill (stream errors; no guaranteed JSON body after headers are sent).
- Aria should treat `type === "run.completed" | "run.failed" | "run.cancelled"` in a `run.event` as the logical end of the assignment UI timeline, not as “close EventSource immediately” (closing is optional client policy).

### 8. `not_configured` / disconnected — fallback detection for Aria

Aria **must** use the deterministic fixture **only** when the live stream is unambiguously unavailable.

#### 8.1 Before opening EventSource (recommended)

`GET {workerBase}/health/ready`

| Outcome | Meaning for Aria |
|---------|------------------|
| `200` + JSON `{ "status": "ready", ... }` | Runtime up; attempt live stream |
| `503` + JSON `{ "status": "not_ready", "reason": string }` | Treat as **disconnected** → fixture fallback allowed |
| Network error / connection refused | **disconnected** → fixture fallback |

`health/ready` also includes `"database": "configured" | "unset"` (presence only, never secret values).

#### 8.2 Stream endpoint itself

`GET /runs/:runId/stream?...`

| Outcome | Body | Aria action |
|---------|------|-------------|
| `200` + `text/event-stream` | SSE frames | Live path; **do not** use fixture |
| `503` + `application/json` | `{ "status": "not_configured", "reason": string, "stream": false }` | **not_configured** → fixture fallback **required** |
| `404` + JSON `{ "status": "not_found" }` | Wrong path | Do not use fixture blindly; fix proxy path |
| EventSource `onerror` after `200` mid-stream | — | Transient disconnect; prefer resume with `Last-Event-ID`, not fixture, unless repeated failure |

**Unambiguous fixture trigger:** HTTP **503** with JSON `"status":"not_configured"` on the stream URL, **or** worker unreachable / `health/ready` **503** before connect.  
A successful `200` SSE must never fall back to the fixture.

### 9. Related non-SSE helpers (optional for Aria)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/golden-path/run` | Re-run seeded Broken Checkout (fakes); returns JSON summary including `runId`, `lastSeq`, `eventTypes` |
| `GET` | `/health/live` | Liveness |

### 10. Proven reference (do not hardcode demo constants in UI)

- Gapless seeded run produces **24** `run.event` frames for a full backfill from `after=0`.
- SSE proof tool observed **≥5** `run.event` frames in a short backfill sample from Postgres.
- Canonical repair beat: `type: "capability.gate_failed"` with summary/detail containing **`expected 9, received 4`**, then later `capability.installed`, `artifact.ready` (`detail.type` = `table.typed` when set), `run.completed`.

---

*Published by Cael for Aria (Track D). Cael will not edit `apps/web`. Coordinate changes to this contract via Node.*
---

## Track A → Track D — Approval decide contract (Cael → Aria)

**Authority:** Cael (runtime + worker). **Aria owns** cockpit buttons/hooks only — wire `fetch` to this contract; do not invent paths.

Frozen API surface (02-CONTRACTS §13): `POST /api/approvals/:id/decide`.  
Worker implements the same shape at `POST /approvals/:id/decide` (proxy from web recommended).

### 1. Approve

| Item | Value |
|------|--------|
| Method | **`POST`** |
| Public path (browser) | **`/api/approvals/:approvalId/decide`** |
| Worker path (upstream) | **`/approvals/:approvalId/decide`** |
| Local worker example | `POST http://127.0.0.1:3001/approvals/0198206f-5f53-7000-8000-0000000000e1/decide` |
| Content-Type | `application/json` |
| Optional header | `Idempotency-Key: <string>` (recommended for hold-to-approve) |

### 2. Deny

Same method and path as approve. Only the **body.decision** value changes.

### 3. Request body

```json
{
  "decision": "approved" | "denied",
  "reason": "string (optional)",
  "runId": "uuid (optional if approval row exists in DB)",
  "assignmentId": "uuid (optional if approval row exists)",
  "orgId": "uuid (optional if approval row exists)"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `decision` | **yes** | Exactly `"approved"` or `"denied"` (not boolean) |
| `reason` | no | Free text; stored in event detail |
| `runId` | **yes for demo synthetic approvals** without a DB row | Broken Checkout smoke id: `0198206f-5f53-7000-8000-000000000006` |
| `assignmentId` | same as runId | `0198206f-5f53-7000-8000-000000000005` |
| `orgId` | same | `0198206f-5f53-7000-8000-000000000001` |

**approvalId** is **only** in the path (`:id`), not the body.

**Demo capability-install approvalId (golden path):** `0198206f-5f53-7000-8000-0000000000e1`

### 4. Success response — `200 application/json`

```json
{
  "ok": true,
  "approvalId": "<uuid>",
  "decision": "approved" | "denied",
  "alreadyDecided": false,
  "runId": "<uuid>",
  "events": [ /* RunEvent objects just emitted, usually one */ ]
}
```

| Field | Meaning |
|-------|---------|
| `alreadyDecided` | `true` if this decision was already stored (idempotent re-POST of the **same** decision) |
| `events` | Events written in the decide transaction (client may apply immediately; SSE will also deliver) |

### 5. Failure responses — problem-details style

| HTTP | `code` | When |
|------|--------|------|
| **400** | `approval.invalid_decision` | `decision` missing or not approved/denied |
| **404** | `approval.not_found` | Unknown id and insufficient synthetic context |
| **409** | `approval.already_decided` | Row already approved/denied with a **different** decision |
| **409** | `approval.expired` | Past `expiresAt` / decision expired |
| **500** | `approval.decide_failed` | Unexpected server error |
| **503** | `not_configured` | `DATABASE_URL` unset (same spirit as stream) |

Body shape:

```json
{
  "type": "about:blank",
  "title": "string",
  "status": 409,
  "code": "approval.already_decided",
  "detail": "human-readable"
}
```

### 6. Idempotency

- **Same decision twice → 200**, `alreadyDecided: true` (hold-to-approve may fire twice — safe).
- **Opposite decision after decide → 409** `approval.already_decided`.
- Prefer sending `Idempotency-Key` header unique per hold gesture; server treats logical decide as above even without it.

### 7. SSE events after successful approve (client must react to stream)

Do **not** optimistically invent capability install. After `decision: "approved"` expect `run.event` frames (same envelope as SSE contract) including:

| Order (typical) | `type` | Notes |
|-----------------|--------|--------|
| 1 | **`approval.granted`** | `refs.approvalId` matches; clears pending card |
| 2+ | **`capability.installed`** (if install was gated) | `refs.capabilityId`, detail.name/slug/version |
| … | **`step.started` / `step.completed` / `artifact.ready`** | Run resumes |
| last | **`run.completed`** | When finished |

After deny:

| `type` | Notes |
|--------|--------|
| **`approval.denied`** | `refs.approvalId` matches; card → denied; run stays blocked/awaiting_approval as appropriate |

Client cursor: advance with SSE `id` / `data.seq` as in the SSE contract. Apply `events[]` from the HTTP response **or** wait for SSE (de-dupe by `seq`).

### 8. Broken Checkout seed ids (demo correctness)

| Field | UUID |
|-------|------|
| **assignmentId** | `0198206f-5f53-7000-8000-000000000005` |
| **runId** | `0198206f-5f53-7000-8000-000000000006` |
| **orgId** | `0198206f-5f53-7000-8000-000000000001` |
| **approvalId** (install) | `0198206f-5f53-7000-8000-0000000000e1` |
| Live capability | `checkout-error-log-analyzer` only |

**Production:** must run **`pnpm db:seed`** (or deploy seed) against the deployed DB so assignment/contract/milestones overwrite any stale API-change copy (`onConflictDoUpdate` now forces Broken Checkout). **Wisp owns running seed on Railway.**


---

## Track A → Aria — Worker control plane (final contracts)

**Worker base (local):** `http://127.0.0.1:3001`  
**Worker base (prod):** `WORKER_PUBLIC_URL` (browser should use same-origin web proxy if CORS not enabled)  
**Fixed demo IDs (never invent new ones):**

| Field | UUID |
|-------|------|
| assignmentId | `0198206f-5f53-7000-8000-000000000005` |
| runId | `0198206f-5f53-7000-8000-000000000006` |
| orgId | `0198206f-5f53-7000-8000-000000000001` |
| approvalId (install) | `0198206f-5f53-7000-8000-0000000000e1` |
| cockpit | `https://dextwork.com/a/0198206f-5f53-7000-8000-000000000005` |

### A. Start / populate demo run

```
POST /v1/golden-path/run
Content-Type: application/json
Body: {}   (empty object fine; no body required)
```

**Always uses fixed assignment/run above** (Broken Checkout). Does not create new UUIDs.

**Success `200`:**
```json
{
  "ok": true,
  "mode": "postgres",
  "runId": "0198206f-5f53-7000-8000-000000000006",
  "assignmentId": "0198206f-5f53-7000-8000-000000000005",
  "eventCountInDb": 26,
  "lastSeq": 26,
  "eventTypes": ["plan.drafted", "…", "run.completed"],
  "stepStatus": "completed",
  "artifactId": "0198206f-5f53-7000-8000-000000000101",
  "artifactTitle": "Affected customers — annual checkout",
  "distinctCount": 9,
  "attempt1FailureMessage": "expected 9, received 4",
  "runFinished": "completed",
  "streamPath": "/runs/0198206f-5f53-7000-8000-000000000006/stream?after=0"
}
```

**Failure `500`:** `{ "ok": false, "error": "string" }`  
**Not deployed `404`:** worker image too old — Wisp must redeploy.

**Demo sequence:** (1) `POST /api/demo/reset` or `pnpm db:seed` → empty opening · (2) `POST /v1/golden-path/run` → populated · (3) open cockpit URL · (4) SSE `GET /runs/:runId/stream?after=0`.

### B. Approve / deny (Hold-to-approve)

```
POST /approvals/:approvalId/decide
Content-Type: application/json

{
  "decision": "approved",
  "reason": "optional",
  "runId": "0198206f-5f53-7000-8000-000000000006",
  "assignmentId": "0198206f-5f53-7000-8000-000000000005",
  "orgId": "0198206f-5f53-7000-8000-000000000001"
}
```

Deny: same with `"decision": "denied"`.

**Browser public path (Aria):** `POST /api/approvals/:approvalId/decide` — proxy to worker path above.

**Success `200`:**
```json
{
  "ok": true,
  "approvalId": "0198206f-5f53-7000-8000-0000000000e1",
  "decision": "approved",
  "alreadyDecided": false,
  "runId": "0198206f-5f53-7000-8000-000000000006",
  "events": [ { "type": "approval.granted", "seq": N, "refs": { "approvalId": "…" }, "...": "…" } ]
}
```

Idempotent: second identical decide → `200` + `"alreadyDecided": true`.

**Errors:** `400` `approval.invalid_decision` · `404` `approval.not_found` · `409` `approval.already_decided` | `approval.expired` · `500` `approval.decide_failed`.

**SSE after approve:** `approval.granted` (then capability/step/artifact events if not already completed). React to stream; de-dupe by `seq`.

### C. Verified locally (control-smoke.ts EXIT 0)

- golden-path fixed ids ✓ · 26 events · 4→9 · table.typed ✓  
- decide first alreadyDecided after auto-grant ✓ · second idempotent ✓  
- final seed opening: run `queued`, event_seq 0, eventCount 0 ✓  

**Production:** worker HTTP routes still 404 until Wisp deploys current worker image; then run seed → golden-path/run → smoke stream with non-zero frames.


---

## Track A → Aria — Start assignment + approval (FINAL WAR ROOM)

**Published for Start button + Hold-to-approve.** Cael owns worker + web proxies. Aria owns button loading/error UI only.

### Fixed IDs (always)

| Field | UUID |
|-------|------|
| assignmentId | `0198206f-5f53-7000-8000-000000000005` |
| runId | `0198206f-5f53-7000-8000-000000000006` |
| orgId | `0198206f-5f53-7000-8000-000000000001` |
| approvalId | `0198206f-5f53-7000-8000-0000000000e1` |
| cockpit | `https://dextwork.com/a/0198206f-5f53-7000-8000-000000000005` |

---

### 1. Start assignment (fixes blank demo)

**Browser (Aria Start button):**

```
POST /api/demo/start
Content-Type: application/json
Credentials: same-origin
# Demo access: same gate as /api/demo/reset (header/cookie/query DEMO_ACCESS_CODE as other demo mutations)

Body: {} 
```

**Upstream worker:** `POST {WORKER_URL}/v1/golden-path/run` with same body.

**Success `200`:**
```json
{
  "ok": true,
  "assignmentId": "0198206f-5f53-7000-8000-000000000005",
  "runId": "0198206f-5f53-7000-8000-000000000006",
  "lastSeq": 26,
  "eventCountInDb": 26,
  "streamPath": "/api/runs/0198206f-5f53-7000-8000-000000000006/stream?after=0",
  "distinctCount": 9,
  "attempt1FailureMessage": "expected 9, received 4",
  "artifactTitle": "Affected customers — annual checkout",
  "runFinished": "completed",
  "mode": "postgres",
  "worker": { }
}
```

**Failure:**
| HTTP | code | When |
|------|------|------|
| 401/403 | demo gate | Missing/invalid DEMO_ACCESS_CODE |
| 503 | `not_configured` / `worker.route_missing` | Worker down or old image (404) |
| 500 | `worker.golden_path_failed` | Worker error body in `worker` |

**After Start — SSE (cockpit already open on assignment URL):**  
Events appear on existing EventSource `GET /api/runs/0198206f-5f53-7000-8000-000000000006/stream?after=0` (or reconnect with `after=0` after Start). Expect ordered `run.event` frames including `capability.gate_failed` (`expected 9, received 4`), repair, `approval.requested`, `approval.granted` (auto in fake path), `artifact.ready` (`table.typed`), `run.completed`.

**Aria Start UX:** loading while fetch in flight; on 200 leave SSE paint; on error show `message`/`code`; do not invent events client-side except optional optimistic "Starting…".

---

### 2. Approve / deny (must persist via worker)

**Browser:**

```
POST /api/approvals/:approvalId/decide
Content-Type: application/json
Idempotency-Key: <unique per hold gesture>

{
  "decision": "approved",
  "runId": "0198206f-5f53-7000-8000-000000000006",
  "assignmentId": "0198206f-5f53-7000-8000-000000000005",
  "orgId": "0198206f-5f53-7000-8000-000000000001",
  "reason": "optional"
}
```

Deny: `"decision": "denied"`.

**Upstream:** `POST {WORKER_URL}/approvals/:approvalId/decide` — **persists** decision + emits SSE events (not React-only).

**Success `200`:**
```json
{
  "ok": true,
  "approvalId": "…",
  "decision": "approved",
  "alreadyDecided": false,
  "runId": "…",
  "events": [ { "type": "approval.granted", "seq": N, "refs": { "approvalId": "…" } } ]
}
```

**Idempotent:** second same decision → `200` + `alreadyDecided: true` (hold-to-approve safe).

**Errors:** 400 invalid_decision · 404 not_found · 409 already_decided/expired · 503 worker unreachable (`code: not_configured`).

**SSE after approve:** `approval.granted` then resume (`capability.installed` / steps / artifact if not already complete). Apply `events[]` from HTTP response **and/or** SSE; de-dupe by `seq`.

`useRunStream` controls.approve/deny now call this proxy (persist). FoundryPanel receives onApprove/onDeny from cockpit shell.

---

### 3. Env (web service)

| Var | Purpose |
|-----|---------|
| `WORKER_URL` or `WORKER_PUBLIC_URL` | Worker origin, default `http://127.0.0.1:3001` |
| `DEMO_ACCESS_CODE` | Required for `/api/demo/start` (same as reset/seed) |


---

## OWNERSHIP GUARD (Node) — Cael vs Aria

| Owner | Paths |
|-------|--------|
| **Cael** | `apps/worker/**`, `packages/agent-runtime/**`, `packages/events/**`, `packages/jobs/**`, `packages/foundry/**`, `packages/execution/**`, `docs/changelog/INTERFACES.md` (contracts) |
| **Aria** | All `apps/web/**` routes, hooks, cockpit UI |

Cael does **not** edit `apps/web`. Mismatches below are one-line notes for Aria only.

### Read-only audit of current Aria proxies (tree as of now)

| Proxy | Method path | Upstream | Match? |
|-------|-------------|----------|--------|
| Start | `POST /api/demo/start` | `POST {base}/v1/golden-path/run` | **YES** — correct worker path |
| Approve/deny | `POST /api/approvals/:approvalId/decide` | `POST {base}/approvals/:id/decide` | **YES** — correct worker path |
| SSE | `GET /api/runs/:runId/stream` | (web may PG-stream or proxy) | See SSE section |

**Env mismatch (one-line for Aria):**  
`decide` resolves `WORKER_INTERNAL_URL || WORKER_PUBLIC_URL || WORKER_URL || http://127.0.0.1:3001`; `start` omits `WORKER_INTERNAL_URL`. **Fix:** use the same base resolver as decide so Railway internal networking works for Start.

**Hook (use-run-stream decide):** already `fetch('/api/approvals/…/decide')` with body `{ decision, runId, assignmentId, orgId }` + `Idempotency-Key` — **matches** worker contract. Offline path injects local granted/denied so UI does not hang (worker must still be up on stage for real persist).

### Worker endpoints (Cael — deployable / tested in-process)

`control-smoke.ts` **EXIT 0** (same code paths as worker handlers).  
Docker image may still 404 until Wisp deploys current worker.

#### POST /v1/golden-path/run
- Body: `{}`
- Fixed IDs only: assignment `…005`, run `…006`
- 200: `{ ok, mode, runId, assignmentId, eventCountInDb, lastSeq, eventTypes, stepStatus, artifactId, artifactTitle, distinctCount, attempt1FailureMessage, runFinished, streamPath }`
- streamPath (worker): `/runs/…006/stream?after=0` — browser uses `/api/runs/…006/stream?after=0`

#### POST /approvals/:approvalId/decide
- Body: `{ decision: "approved"|"denied", reason?, runId?, assignmentId?, orgId? }`
- 200: `{ ok, approvalId, decision, alreadyDecided, runId, events[] }` — **idempotent** same decision
- 400/404/409/500 as problem-details codes

#### GET /runs/:runId/stream?after=
- Exclusive resume; `Last-Event-ID` preferred; see SSE section above

