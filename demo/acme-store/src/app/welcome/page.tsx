export default function WelcomePage() {
  return (
    <main className="welcome container">
      <div>
        <h1>You&apos;re in.</h1>
        <p>
          Checkout completed. Your workspace is provisioning — check your email for the next
          steps.
        </p>
        <a className="cta secondary" href="/pricing">
          Back to pricing
        </a>
      </div>
    </main>
  );
}
