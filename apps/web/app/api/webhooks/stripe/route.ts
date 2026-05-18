import { NextResponse } from 'next/server';

/**
 * Stripe webhook receiver — placeholder. Wired in Sprint 0 Day 5+.
 *
 * Will: verify the Stripe-Signature header against STRIPE_WEBHOOK_SECRET,
 * insert into webhook_events for idempotency, then dispatch on event type
 * (subscription.{created,updated,deleted}, invoice.payment_{succeeded,failed},
 * customer.subscription.trial_will_end).
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: 'Stripe webhook handler not yet implemented' },
    { status: 501 },
  );
}
