import 'server-only';

/**
 * Time-limited acquisition offers, applied at Stripe Checkout as stacked
 * coupons via a signup link (e.g. https://buildersready.uk/?offer=flash48).
 *
 * The URL `?offer=<slug>` is captured into the `br_offer` cookie by
 * middleware.ts so it survives the signup -> onboarding -> billing journey,
 * then read in createCheckoutSession.
 *
 * A promotion code the customer TYPES can only carry one coupon, which is why
 * multi-tier offers (e.g. 50% month one THEN 15% the rest of the year) are
 * applied server-side as a `discounts` array instead.
 *
 * The 48-hour deadline is enforced in Stripe itself via each coupon's
 * `redeem_by` date — once past, Stripe rejects the coupon and
 * createCheckoutSession falls back to a normal checkout, so an expired link
 * never blocks a signup. `endsAt` below is an optional belt-and-braces
 * server-side cutoff; leave null to rely on Stripe's redeem_by.
 */

export interface Offer {
  slug: string;
  /** Stripe coupon IDs, applied in order. Stripe stacks them on invoice 1. */
  coupons: string[];
  /** Optional hard server-side cutoff (ISO 8601). Null = rely on Stripe redeem_by. */
  endsAt: string | null;
  /** Human label, used in metadata / internal reporting. */
  label: string;
}

const OFFERS: Record<string, Offer> = {
  // 50% off the first month (Flash48 = percent_off 50, duration once), then
  // 15% off for the rest of the year (Flash48-15-roy = percent_off 15,
  // duration repeating 11 months). Stacked on invoice 1 => ~57.5% month one.
  flash48: {
    slug: 'flash48',
    coupons: ['Flash48', 'Flash48-15-roy'],
    endsAt: null,
    label: '48hr: 50% first month, then 15% for the year',
  },
};

/** Resolve a cookie/URL offer slug to a live Offer, honouring any endsAt cutoff. */
export function resolveOffer(slug: string | null | undefined): Offer | null {
  if (!slug) return null;
  const offer = OFFERS[slug.toLowerCase()];
  if (!offer) return null;
  if (offer.endsAt && Date.now() > Date.parse(offer.endsAt)) return null;
  return offer;
}
