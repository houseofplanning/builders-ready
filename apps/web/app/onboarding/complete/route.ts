import { type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Landing point after Stripe Checkout. Stripe redirects here with the
 * checkout session id. We retrieve the session and stamp the subscription
 * onto the tenant straight away, so the card-required gate doesn't have to
 * wait for the (async) webhook. The webhook still runs as a backup and
 * writes the same fields idempotently.
 */
export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
      const sub = session.subscription;
      const tenantId = session.metadata?.tenant_id;
      if (tenantId && sub && typeof sub !== 'string') {
        await getSupabaseAdmin()
          .from('tenants')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status === 'active' ? 'active' : 'trialing',
            trial_ends_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
          })
          .eq('id', tenantId);
      }
    } catch (err) {
      console.error('[onboarding/complete] could not confirm checkout', err);
    }
  }
  redirect('/onboarding/branding');
}
