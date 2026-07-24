import { PricingClient } from "@/components/PricingClient";

export default function PricingPage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Simple pricing that scales with volume</h1>
        <p>
          Start monthly, switch to annual when you are ready. Every plan includes Stripe-powered
          checkout and workspace provisioning.
        </p>
      </section>
      <PricingClient />
    </main>
  );
}
