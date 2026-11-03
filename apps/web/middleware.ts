import { NextResponse, type NextRequest } from 'next/server';

/**
 * Capture an acquisition-offer slug from the URL (?offer=flash48) into a
 * cookie so it survives the signup -> onboarding -> billing journey and can
 * be read when the Stripe Checkout session is built (see lib/offers.ts and
 * createCheckoutSession). Does nothing else — every request just passes
 * through.
 */
export function middleware(req: NextRequest) {
  const offer = req.nextUrl.searchParams.get('offer');
  const res = NextResponse.next();
  if (offer) {
    res.cookies.set('br_offer', offer.toLowerCase(), {
      maxAge: 60 * 60 * 24 * 7, // 7 days — long enough to finish signing up
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  return res;
}

export const config = {
  // Run on pages, not on static assets / image optimiser / API internals.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|txt|xml|woff2?)).*)',
  ],
};
