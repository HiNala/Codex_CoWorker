import { NextRequest } from "next/server";
import Stripe from "stripe";
import { isKnownPlan, resolvePriceId } from "@/checkout/prices";
import { buildCheckoutSessionParams } from "@/checkout/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let plan = "";
  let interval = "";

  try {
    const body = (await req.json()) as { plan?: string; interval?: string; email?: string };
    plan = typeof body.plan === "string" ? body.plan : "";
    interval = typeof body.interval === "string" ? body.interval : "";

    if (!isKnownPlan(plan) || !interval) {
      return Response.json({ error: "Invalid plan or interval." }, { status: 400 });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || secret.includes("replace_me")) {
      return Response.json(
        {
          error: "Stripe is not configured. Set STRIPE_SECRET_KEY for test-mode checkout.",
          code: "not_configured",
        },
        { status: 503 },
      );
    }

    const priceId = resolvePriceId(plan, interval);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.nextUrl.origin ||
      "http://localhost:3210";

    const stripe = new Stripe(secret);
    const params = buildCheckoutSessionParams({
      priceId: priceId as string,
      successUrl: `${origin}/welcome`,
      cancelUrl: `${origin}/pricing`,
      customerEmail: body.email,
    });

    const session = await stripe.checkout.sessions.create(params);
    return Response.json({ url: session.url });
  } catch (err) {
    logger.error({ err: String(err), plan, interval }, "checkout_failed");
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
