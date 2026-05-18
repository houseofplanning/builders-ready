import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Auth + tenant middleware.
 *
 * 1. Refreshes the Supabase session cookie (required for @supabase/ssr to
 *    keep server clients in sync with the browser).
 * 2. Gates `/onboarding/*` and `/<slug>/*` on a logged-in session.
 *    Unauthenticated requests redirect to /login.
 * 3. We do NOT validate slug-vs-tenant here — the page layout
 *    (`requireTenantBySlug`) handles that with a redirect, keeping the
 *    middleware free of an extra DB round-trip per request.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  // Refresh session if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = url.pathname;
  const isProtected =
    path.startsWith('/onboarding') ||
    isTenantSlugPath(path);
  const isAuthPage =
    path === '/login' || path === '/signup' || path.startsWith('/accept');

  if (isProtected && !user) {
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Logged-in users hitting /login or /signup get sent to their dashboard.
  if (isAuthPage && user) {
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant:tenants(slug)')
      .eq('user_id', user.id)
      .maybeSingle();
    const slug = (membership?.tenant as { slug?: string } | null)?.slug;
    if (slug) {
      url.pathname = `/${slug}/dashboard`;
      url.searchParams.delete('next');
      return NextResponse.redirect(url);
    }
  }

  return res;
}

// Reserved top-level paths that ARE NOT tenant slugs. Keep aligned with
// the RESERVED set in packages/shared/src/slug.ts.
const RESERVED_TOP_LEVEL = new Set([
  '',
  'login',
  'signup',
  'accept',
  'onboarding',
  'pricing',
  'about',
  'contact',
  'privacy',
  'terms',
  'api',
  '_next',
  'favicon.ico',
]);

function isTenantSlugPath(path: string): boolean {
  // e.g. "/regal/dashboard" → top = "regal" (not reserved) → tenant path
  const top = path.split('/').filter(Boolean)[0] ?? '';
  return top !== '' && !RESERVED_TOP_LEVEL.has(top);
}

export const config = {
  // Run on every path except static assets, _next internals, and webhooks.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/health).*)',
  ],
};
