import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Mobile customer signup. Creates an auth user with NO tenant membership
 * (that's what makes them a marketplace customer), email auto-confirmed so the
 * app can sign in immediately afterwards. Free; no card.
 *
 * Body: { full_name, email, password }
 */
const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check your name, email and password (8+ characters).' },
      { status: 400 },
    );
  }
  const email = parsed.data.email.trim().toLowerCase();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'An account with that email already exists. Sign in instead.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error?.message ?? 'Could not create account.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
