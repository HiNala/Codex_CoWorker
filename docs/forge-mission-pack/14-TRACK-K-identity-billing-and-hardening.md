# 14 — TRACK K: Identity, Work Credits, Billing, and Hardening — **DEFERRED BY DESIGN**

> **Do not start this track until the critical path is green at Gate 2.**
>
> Authentication, organisation roles, Stripe, and the credit ledger are the parts of a SaaS that every product has and no judge remembers. They consume time proportional to their correctness requirements and produce nothing anyone points at.
>
> If the clock runs out, we lose a sign-up form. That is the correct thing to lose.

**You own:** `packages/auth/**` · `packages/billing/**` · `apps/web/src/app/(auth)/**` · `apps/web/src/app/api/auth/**` · `apps/web/src/app/(app)/settings/billing/**`

---

## 1. What stands in until you run

The **dev identity shim**, shipped by ignition. A signed cookie carrying a fixed demo organisation, user, and role, implementing the frozen `SessionProvider` contract. The public URL is gated by a shared `DEMO_ACCESS_CODE` so it is not open to the internet.

```ts
export const getSession: SessionProvider = async (req) =>
  flags.auth === "dev" ? DEV_SESSION : realSession(req);
```

**One file changes when you land.** Because every server function already takes `Session` as its first argument (`02-CONTRACTS` §2), there is nothing else to rewire. Authorisation was never deferred — only authentication was.

---

## 2. Priority order — ship in this sequence and stop wherever the clock stops

Each level is independently valuable and independently shippable.

| Level | Ship                                                                     | Value                            |
| ----- | ------------------------------------------------------------------------ | -------------------------------- |
| **1** | Access-code gate hardening: rate limit, constant-time compare, audit log | The demo URL is not wide open    |
| **2** | Real email + password sign-up and sign-in, sessions, sign out            | The product is real to a visitor |
| **3** | Organisations, membership, roles, invitations                            | Multi-tenant story               |
| **4** | Work Credit ledger with reserve, consume, settle                         | The business model, working      |
| **5** | Usage UI: balance, period consumption, per-assignment receipts           | Judges can see the economics     |
| **6** | Stripe checkout, portal, webhooks                                        | A revenue path                   |
| **7** | Password reset, email verification, session management UI                | Completeness                     |

Levels 4 and 5 are worth more to this project than level 6. **A visible, honest cost model beats a functioning checkout** in a room evaluating whether this could be a company. If you only get one thing past level 3, make it the ledger and the usage page.

---

## 3. Authentication, done correctly and quickly

Hand-rolled, per the team's preference. Follow OWASP; there is no time to invent anything.

- **Argon2id** at current OWASP minimum parameters or measured stronger. Library-generated unique salt. Optional server-side pepper from `SESSION_SECRET`.
- **Opaque random session IDs.** Store only a SHA-256 hash server-side. Never a JWT in `localStorage`.
- `__Host-` prefixed cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- **Rotate the session ID** on login, on password change, and on privilege change.
- Idle expiry 7 days, absolute expiry 30 days.
- Login throttling by account **and** by a privacy-preserving client identifier — a salted hash, never a raw IP.
- Password reset and sign-up must be **enumeration-resistant**: identical response and identical timing whether or not the account exists.
- CSRF: `Origin`/`Host` validation on every state-changing browser request, plus a token where a cross-site form is possible.
- Audit events for register, login, failed login, logout, password change, reset request, reset completion, role change, and invitation.
- Never log a password, a raw reset token, a session ID, or an OAuth secret.

### Auth UI

Adapt the supplied split-screen concept, with its production problems fixed (`17-PACK` §4): `use client` only on the form, shared Zod validation, real server actions instead of alert handlers, `autocomplete` attributes, per-field errors and an error summary, pending states, and a password-manager-friendly DOM.

Replace the remote testimonial avatars with the **live product preview** from Track H — one capability tile building and an artifact going ready. It is more credible than a stock photograph and it reuses components you already have.

No Google button. There is no identity provider behind it, and a dead button on a sign-in page is a credibility leak.

---

## 4. Work Credits — the ledger

Append-only, double-entry, integer microcredits.

```
credit_accounts          (org_id, currency, created_at)
credit_ledger_entries    (id, account_id, kind, amount_microcredits,
                          business_ref UNIQUE, run_id, created_at, metadata)
credit_reservations      (id, account_id, run_id, amount, status, expires_at)
```

Entry kinds: `grant` · `purchase` · `reservation_hold` · `settlement` · `release` · `adjustment` · `expiration` · `refund`.

**Invariants — these are the whole point of the track:**

1. No mutable balance column is the sole source of truth. Balance derives from the ledger, optionally projected into a transactionally maintained cache.
2. Every entry has a **unique business reference**. This is what makes webhook replay harmless.
3. Reservations are atomic and expire. A crashed run releases its hold via the reconciliation job.
4. Settlement can never exceed the authorised amount without a new approval.
5. Negative balances follow an explicit, written overage policy.
6. Integer arithmetic only. Never a float. Not once.

Property test: generate 10,000 random sequences of grants, reservations, settlements, releases, and refunds, and assert that the derived balance always equals the sum of entries and never goes negative outside the overage policy.

---

## 5. The legal boundary — state it correctly

- OpenAI service credits are **non-transferable and are never resold.**
- Customers buy access to this application and its internal **Work Credits**.
- Never label a customer balance "OpenAI credits". Never expose a provider key or provider billing account.
- Work Credit terms, expiration, refunds, promotional grants, and overage policy are written down and linked from the pricing page.
- The application ledger is authoritative. Stripe Billing Credits may mirror it later; they do not replace it.

Get this wrong on a slide and it becomes the only thing anyone asks about.

---

## 6. Usage and billing UI

Current plan · credit balance · current period consumption · breakdown by coworker, project, and provider category · per-assignment receipts · budget settings · low-balance alerts · CSV export · billing history and portal link.

Only show auto-top-up and overage controls if they are actually implemented. A toggle that does nothing is worse than an absent feature.

---

## 7. Stripe, if you reach it

Products and prices per environment · Checkout Session · customer portal · subscription webhook lifecycle · invoice payment and failure · trial handling · plan change and proration policy · cancellation behaviour · **idempotent webhook receipts** reusing the same `webhook_receipts` table Track F built for Zendesk.

Test: a duplicate webhook is harmless · out-of-order subscription events converge · a failed payment degrades access gracefully rather than deleting anything.

---

## 8. Hardening pass, if the clock allows

- Deny-by-default authorisation tests for every route, including cross-org, cross-role, and cross-resource
- A rate limit on every unauthenticated endpoint
- Security headers: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and a real Content-Security-Policy
- Secret-leak scan across logs and responses
- Dependency audit recorded, not necessarily zero
- A short STRIDE threat model in `docs/decisions/` covering cross-tenant access, session theft, CSRF and webhook forgery, prompt injection, secret exfiltration into generated code, artifact XSS and CSV injection, SSRF through research, billing replay, and denial of wallet — with mitigations, tests, and explicitly accepted risks

---

## 9. Answer these in your handoff entry

1. **Invariants.** What guarantees the ledger balance always reconciles?
2. **Simplest design.** How many files changed when real authentication replaced the shim? (The answer should be one plus the new package.)
3. **Verify.** How does someone confirm cross-tenant access is denied?
