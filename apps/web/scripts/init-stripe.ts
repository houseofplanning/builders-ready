/* eslint-disable no-console */
/**
 * One-off script: create the Builders Ready Stripe Product and 6 Prices
 * (Starter / Pro / Unlimited × monthly / annual) at the locked £29 / £69
 * / £149 numbers from packages/shared/src/billing.ts.
 *
 * Idempotent: re-running it won't duplicate the product. It'll create
 * extra Prices each run though — so only run once per environment.
 *
 * Run from the repo root:
 *   pnpm dlx tsx apps/web/scripts/init-stripe.ts
 *
 * Reads STRIPE_SECRET_KEY from apps/web/.env.local. Prints the 6 price
 * IDs at the end — paste them into the same .env.local under the
 * STRIPE_PRICE_* env vars.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { TIERS } from '@br/shared';

// ---------- minimal .env loader (no dotenv dep) ----------
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
const envPath = path.resolve(here, '../.env.local');
loadEnv(envPath);

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error(
    `STRIPE_SECRET_KEY missing from ${envPath}. Paste your sk_test_... key first.`,
  );
  process.exit(1);
}
if (!SECRET.startsWith('sk_')) {
  console.error('STRIPE_SECRET_KEY looks wrong — it should start with sk_test_ or sk_live_.');
  process.exit(1);
}

const stripe = new Stripe(SECRET, {
  // @ts-expect-error pin to a known-stable API version
  apiVersion: '2024-11-20.acacia',
});

const PRODUCT_NAME = 'Builders Ready Subscription';

async function findOrCreateProduct(): Promise<Stripe.Product> {
  const list = await stripe.products.list({ limit: 100, active: true });
  const existing = list.data.find((p) => p.name === PRODUCT_NAME);
  if (existing) {
    console.log(`✓ Product exists: ${existing.id}`);
    return existing;
  }
  const created = await stripe.products.create({
    name: PRODUCT_NAME,
    description:
      'Multi-tenant SaaS portal for UK premium-residential builders. Pricing scales by active project count.',
    statement_descriptor: 'BUILDERS READY',
    tax_code: 'txcd_10103001', // SaaS — pre-written software downloaded
  });
  console.log(`✓ Product created: ${created.id}`);
  return created;
}

async function createPrice(args: {
  productId: string;
  amount: number;
  interval: 'month' | 'year';
  nickname: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Price> {
  const price = await stripe.prices.create({
    product: args.productId,
    currency: 'gbp',
    unit_amount: args.amount,
    recurring: { interval: args.interval },
    nickname: args.nickname,
    tax_behavior: 'exclusive',
    metadata: args.metadata,
  });
  return price;
}

async function main() {
  console.log(`Connecting to Stripe (key prefix: ${SECRET!.slice(0, 12)}…)\n`);

  const product = await findOrCreateProduct();
  console.log('Creating 6 Prices…\n');

  type RowKey =
    | 'STRIPE_PRICE_STARTER_MONTHLY'
    | 'STRIPE_PRICE_STARTER_ANNUAL'
    | 'STRIPE_PRICE_PRO_MONTHLY'
    | 'STRIPE_PRICE_PRO_ANNUAL'
    | 'STRIPE_PRICE_UNLIMITED_MONTHLY'
    | 'STRIPE_PRICE_UNLIMITED_ANNUAL';
  const out: Record<RowKey, string> = {} as Record<RowKey, string>;

  for (const tier of [TIERS.starter, TIERS.pro, TIERS.unlimited]) {
    const monthly = await createPrice({
      productId: product.id,
      amount: tier.monthlyPence,
      interval: 'month',
      nickname: `${tier.label} — Monthly`,
      metadata: { tier: tier.id, cadence: 'monthly' },
    });
    console.log(
      `  ${tier.label} monthly  £${(tier.monthlyPence / 100).toFixed(2)}  →  ${monthly.id}`,
    );
    out[tier.stripeMonthlyPriceEnv as RowKey] = monthly.id;

    const annual = await createPrice({
      productId: product.id,
      amount: tier.annualPence,
      interval: 'year',
      nickname: `${tier.label} — Annual`,
      metadata: { tier: tier.id, cadence: 'annual' },
    });
    console.log(
      `  ${tier.label} annual   £${(tier.annualPence / 100).toFixed(2)}  →  ${annual.id}`,
    );
    out[tier.stripeAnnualPriceEnv as RowKey] = annual.id;
  }

  console.log('\n────────────────────────────────────────────────────────────────');
  console.log('Paste these into apps/web/.env.local (replace any existing lines):');
  console.log('────────────────────────────────────────────────────────────────\n');
  for (const [k, v] of Object.entries(out)) {
    console.log(`${k}=${v}`);
  }
  console.log('\nDone. Restart pnpm web after pasting.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
