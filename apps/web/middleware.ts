import { type NextRequest, NextResponse } from 'next/server';

/**
 * Placeholder middleware. Once auth is wired we'll:
 *   1. Read the Supabase session cookie via @supabase/ssr.
 *   2. Resolve the user's tenant_id via tenant_members.
 *   3. For /<slug>/* routes, verify the slug matches the user's tenant.
 *   4. Redirect unauthenticated users hitting /<slug>/* to /login.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets, _next, and the Stripe webhook.
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
