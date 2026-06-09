import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';

/**
 * Email-link confirmation handler (password recovery, and any future
 * email-confirm flows).
 *
 * Supabase can deliver the link in two shapes depending on how the email
 * template is configured, so we handle both:
 *
 *   - token_hash + type → verifyOtp. This is cross-device safe (no PKCE
 *     code verifier needed), so a reset requested on a laptop can be opened
 *     on a phone. Requires the email template to use {{ .TokenHash }}.
 *   - code → exchangeCodeForSession. The default PKCE link. Works on the
 *     same browser the reset was requested from.
 *
 * On success the recovery session is written to cookies and we redirect to
 * `next`. On failure we send the user back to /forgot-password to retry.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  // Only allow local redirect targets — never an absolute/off-site URL.
  const rawNext = searchParams.get('next') ?? '/reset-password';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/reset-password';

  const supabase = await createSupabaseServer();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect('/forgot-password?error=expired');
}
