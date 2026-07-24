# acme-store

Customer-facing storefront for **Acme Payments**. Hosts the public pricing page and creates Stripe Checkout sessions for plan upgrades.

> **Demo scenario (live golden path):** Broken Checkout — monthly Stripe checkout works; annual/yearly fails because `PlanToggle` emits `interval: "yearly"` while `PRICE_IDS` is keyed on `annual`. This is **not** the webhook field-rename / API-change incident (inventory only).

## Stack

- Next.js (App Router)
- Stripe Checkout (test mode in development)
- Vitest for unit coverage

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3210/pricing](http://localhost:3210/pricing).

## Environment

| Variable                             | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Server-side Stripe secret (test mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client publishable key                |
| `NEXT_PUBLIC_APP_URL`                | Origin used for success/cancel URLs   |

## Scripts

- `npm run dev` — local app
- `npm test` — unit tests
- `npm run build` — production build

## Checkout flow

1. Customer picks a plan on `/pricing` and chooses monthly or annual billing.
2. Client posts `{ plan, interval }` to `POST /api/checkout`.
3. Server resolves a Stripe Price ID and creates a Checkout Session.
4. Browser redirects to the session URL.

## Project layout

```
src/app/pricing/          Pricing page
src/app/api/checkout/     Checkout session route
src/checkout/             Price map and session helpers
src/components/           Plan cards and billing toggle
logs/                     Operational error samples (ndjson)
```

## Contributing

Open pull requests against `main` from a feature branch named `fix/...` or `forge/...`. Keep PR bodies factual: problem, impact, verification. Do not merge without green CI.

## License

Proprietary — Acme Payments internal demo product.
