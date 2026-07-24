# 21 — RESEARCH: Provider Notes and Citations

**Read the relevant section before writing any adapter.** Several of these differ from what the previous mission pack assumed, and from what a model's training data will confidently tell you. Where a version number appears, verify it at Ignition — the commands are given.

---

## 1. Next.js

**16.2.x is the current stable line. 16.3 is preview — do not use it.**

```bash
npm view next version          # stable
npm view next dist-tags        # confirm 16.3 is tagged preview, not latest
```

Relevant to this build: App Router only, React 19, Server Components by default, `after()` for post-response work, Turbopack stable for dev. Route handlers stream fine for SSE, but pin `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'` on the SSE route or you will spend twenty minutes on a cached event stream.

Docs: `https://nextjs.org/docs`

---

## 2. OpenAI — Responses API

**Use the Responses API, not Chat Completions.** Stateful, built for tool loops, and it is what the Codex tooling aligns with.

Models: `gpt-5.6-sol` (primary reasoning — planning, diagnosis, capability specification), `gpt-5.6-terra` (balanced — summarisation, drafting), `gpt-5.6-luna` (economy — classification, extraction, anything high-volume).

Route by task class, not by "always use the biggest." Triage and classification on `luna` costs a fraction and is indistinguishable in output. Reserve `sol` for the two moments that matter: the diagnosis and the capability specification.

Verify the model list before you hardcode:

```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[].id'
```

MUST:

- Structured outputs via JSON schema for every internal decision. Never parse prose to drive state.
- Stream, and forward reasoning summaries into the trace panel — this is the content that fills the demo's dead air.
- Record `usage` on every call into `usage_events`. The receipt's cost figure derives from these rows and nothing else.
- Set explicit `max_output_tokens`. An unbounded call during a demo is a hang.

Docs: `https://platform.openai.com/docs/api-reference/responses`

---

## 3. Codex CLI

The capability builder and the fix writer both shell out to Codex.

```bash
codex exec --json --output-schema ./schema.json "<prompt>"
codex exec resume --last --json "<repair prompt>"
```

- `--json` gives a structured event stream; parse it into `RunEvent`s rather than scraping stdout.
- `--output-schema` constrains the final payload. Use it for both the capability build and the patch emission — it is the difference between a reliable pipeline and a regex.
- `resume --last` carries context into the repair attempt. Without it, attempt two re-derives everything and the repair takes as long as the build.
- Run inside the sandbox with **no credentials present**. Codex does not need your Stripe key to fix a string-enum mismatch, and the verifier gates assert their absence.

Sandbox approval mode: run non-interactive with full auto-approval **inside the sandbox only**. The isolation is the boundary, not the prompt.

Docs: `https://developers.openai.com/codex/cli/`

---

## 4. Railway

Three products matter here, and two of them are newer than most training data.

### Sandboxes

`railway sandbox` provisions ephemeral, isolated Debian VMs. Available via CLI **and a TypeScript SDK**. Supports custom base images, `ISOLATED` network mode, and — the important one — **forking a running sandbox**.

Fork a pre-warmed sandbox with `acme-store` cloned and `node_modules` installed. This removes 30–40 seconds of cold start from the demo's critical path and is the single highest-leverage optimisation available to you.

**Honesty:** these are isolation for _your_ untrusted code, not hardened multi-tenant isolation for arbitrary customer code. If a judge asks about running untrusted third-party capabilities at scale, say that plainly. Guessing is worse than not knowing.

### Buckets

`railway bucket` gives S3-compatible storage in about two commands. MinIO remains the stated preference and the `ObjectStore` port stays the same either way — but if MinIO eats forty minutes, this is a ten-second escape hatch. Decide by T+70, not at T+110.

### Deploy

```bash
railway up
railway domain          # required AFTER first deploy — `up` does not assign one
railway logs
railway variables --set KEY=value
```

The missing-domain step has cost more hackathon teams more time than any other single thing on this list. Deploy a hello-world at T+10 so the whole path is proven before it matters.

Docs: `https://docs.railway.com/`

---

## 5. Composio

**Breaking change:** managed-OAuth `initiate()` was retired on **2026-07-03**. Use `connectedAccounts.link()`. Any code a model writes from memory will use the old call.

- TypeScript SDK is **ESM-only**, requires **Node 22.22.3+**. If your worker is CJS, this will surface as a cryptic import failure at the worst moment.
- Polling triggers now default to a **15-minute** interval. Do not build a demo beat on a polled trigger; use webhooks or fire the action directly.
- Used here for **Slack and Gmail only**. GitHub is direct Octokit (see `22-TRACK-L` §4) — fewer moving parts on the critical path and full control of the PR body.

Complete both OAuth flows the night before. Not during the build window.

Docs: `https://docs.composio.dev/`

---

## 6. Octen

Research provider. **The endpoints are `search`, `news_search`, and `extract`** — not `/search` and `/broad-search` as the previous pack stated.

- `extract` accepts a `query` alongside the URL and returns intent-focused highlights rather than the whole page. Use it; it cuts model context substantially.
- The response includes `page_structure.primary`. When it equals `"No Main Content"`, discard the result — it is a login wall or a JS shell. Filtering on this before anything reaches the model removes most research garbage.
- Every retrieval writes an `EvidenceRecord` with URL, title, retrieval timestamp, and a content hash. The evidence panel resolves these. No hash, no citation.

---

## 7. Zendesk

**Webhook signature:** `base64(HMAC-SHA256(timestamp + rawBody))`, compared against the `x-zendesk-webhook-signature` header, with `x-zendesk-webhook-signature-timestamp` supplying the timestamp.

Two things that will burn you:

1. You need the **raw body**, before any JSON parsing. In Next.js route handlers, read `await req.text()` and parse afterwards. Framework body-parsing middleware silently breaks the signature.
2. Comparison must be constant-time. `crypto.timingSafeEqual`.

**Deduplication key:** `x-zendesk-webhook-invocation-id`. Store it; reject repeats. Retry behaviour is roughly 5 attempts on timeout and 3 on a 409, with about 12 seconds of patience — so a slow handler _will_ be re-delivered, and without dedupe your demo fires twice.

Return 200 immediately and enqueue. Never do work in the webhook handler.

Ticket operations default to **private notes**. A public reply is an external action and goes through the approval path. There is no configuration that changes this.

Docs: `https://developer.zendesk.com/api-reference/`

---

## 8. Stripe

Test mode throughout. Publishable key client-side, secret key server-side only, restricted key if you have the two minutes to make one.

The demo never moves money and never needs a webhook from Stripe. `checkout.sessions.create` returning a real session URL is the entire integration surface. Do not build more.

Docs: `https://docs.stripe.com/api/checkout/sessions/create`

---

## 9. Drizzle ORM and PostgreSQL 17

- `drizzle-kit generate` then `drizzle-kit migrate`. Never `push` against anything you care about.
- Wrap migrations in a Postgres advisory lock so parallel container starts do not race — with several services booting simultaneously on Railway, this happens on roughly the first deploy.
- The job queue is Postgres: `FOR UPDATE SKIP LOCKED` with lease columns. No Redis. At demo scale this is not a compromise, it is the correct call — one fewer service to fail.
- UUIDv7 for IDs: time-ordered, index-friendly, and sortable in the UI without a separate timestamp column.

Docs: `https://orm.drizzle.team/docs/overview`

---

## 10. Security references

- OWASP ASVS for the auth work in Track K, if you reach it.
- Argon2id for password hashing; opaque session tokens, hashed at rest.
- Never render model output as HTML. Sanitise markdown; strip `javascript:` URIs.
- CSV export: prefix cells beginning `=`, `+`, `-`, or `@` with a single quote. CSV injection into a judge's spreadsheet is a memorable way to lose.
- Fine-grained GitHub PAT, single repo, contents + pull requests only.

---

## 11. Verify-at-Ignition checklist

Run these in the first ten minutes and record the answers in the changelog. Every one of them can invalidate an assumption in this pack.

```bash
node --version                                    # ≥ 22.22.3 for Composio
npm view next version                             # expect 16.2.x
npm view drizzle-orm version
codex --version
railway --version
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[].id' | grep gpt-5.6
```

If any answer differs from what is written above, **amend this document first**, note it in the changelog, and then write code. A wrong version number discovered at T+90 costs an hour; discovered at T+10 it costs nothing.
