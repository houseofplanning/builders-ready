/* eslint-disable no-console */
/**
 * One-off: recreate the 3 copied subscribers' Starter-monthly subscriptions on
 * the Builders Ready Ltd Stripe account. Their customers + cards were copied
 * from the old account (same customer IDs); subscriptions are NOT copied, so we
 * create them here, each with trial_end = their existing renewal date, so the
 * first charge on the new account lands on the SAME day their old one would
 * have renewed. No double charge, no gap.
 *
 * Reads STRIPE_SECRET_KEY and STRIPE_PRICE_STARTER_MONTHLY from
 * apps/web/.env.local (must be the NEW Builders Ready Ltd account).
 *
 * Run once from the repo root:
 *   pnpm dlx tsx apps/web/scripts/migrate-subs.ts
 *
 * Safe to re-run: it skips any customer that already has an active/trialing sub.
 * Prints the new subscription IDs at the end — paste them back for the DB update.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

function loadEnv(filePath: string) {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const k = m[1];
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.resolve(here, '../.env.local'));

const SECRET = process.env.STRIPE_SECRET_KEY;
const PRICE = process.env.STRIPE_PRICE_STARTER_MONTHLY;
if (!SECRET || !SECRET.startsWith('sk_')) {
  console.error('STRIPE_SECRET_KEY missing/invalid in apps/web/.env.local');
  process.exit(1);
}
if (!PRICE || !PRICE.startsWith('price_')) {
  console.error('STRIPE_PRICE_STARTER_MONTHLY missing/invalid in apps/web/.env.local');
  process.exit(1);
}

const stripe = new Stripe(SECRET, {
  // @ts-expect-error pin to the account's required version
  apiVersion: '2025-03-31.basil',
});

// Renewal day = existing current_period_end. Bill the new sub from this date.
const MIGRATE = [
  { label: 'Stephen Goddard / capitallofts', customer: 'cus_VPYi4CjIEZ8bkl', renewal: '2026-11-23' },
  { label: 'ltroofing2026',                  customer: 'cus_VP5UNgt69LsEuj', renewal: '2026-11-22' },
  { label: 'Balraj / jagdevlegal',           customer: 'cus_VCc3zQZ816EGss', renewal: '2026-11-19' },
];

async function defaultPaymentMethod(customerId: string): Promise<string | null> {
  const cust = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
  const def = cust.invoice_settings?.default_payment_method;
  if (typeof def === 'string') return def;
  if (def && typeof def === 'object') return def.id;
  // Fallback: first saved card.
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return pms.data[0]?.id ?? null;
}

async function main() {
  console.log(`Account key: ${SECRET!.slice(0, 12)}…  Price: ${PRICE}\n`);
  const results: { label: string; customer: string; subscription: string; status: string }[] = [];

  for (const m of MIGRATE) {
    // Skip if already has a live sub (idempotent).
    const existing = await stripe.subscriptions.list({ customer: m.customer, status: 'all', limit: 10 });
    const live = existing.data.find((s) => s.status === 'active' || s.status === 'trialing');
    if (live) {
      console.log(`• ${m.label}: already has ${live.status} sub ${live.id} — skipping.`);
      results.push({ label: m.label, customer: m.customer, subscription: live.id, status: live.status });
      continue;
    }

    const pm = await defaultPaymentMethod(m.customer);
    if (!pm) {
      console.error(`✗ ${m.label} (${m.customer}): no card found on the copied customer — check the copy completed.`);
      continue;
    }

    const trialEnd = Math.floor(Date.parse(`${m.renewal}T12:00:00Z`) / 1000);
    const sub = await stripe.subscriptions.create({
      customer: m.customer,
      items: [{ price: PRICE! }],
      default_payment_method: pm,
      trial_end: trialEnd,
      proration_behavior: 'none',
      metadata: { migrated_from: 'acct_1TYvg3ExTtQtTRhw', tier: 'starter', cadence: 'monthly' },
    });
    console.log(`✓ ${m.label}: created ${sub.id} (${sub.status}) — first charge ${m.renewal}`);
    results.push({ label: m.label, customer: m.customer, subscription: sub.id, status: sub.status });
  }

  console.log('\n--- paste these back ---');
  for (const r of results) {
    console.log(`${r.customer}  ->  ${r.subscription}  (${r.status})`);
  }
}

main().catch((e) => {
  console.error('\nFailed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
