export interface CheckoutSessionArgs {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export function buildCheckoutSessionParams(args: CheckoutSessionArgs) {
  return {
    mode: "subscription" as const,
    line_items: [{ price: args.priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    ...(args.customerEmail ? { customer_email: args.customerEmail } : {}),
  };
}
