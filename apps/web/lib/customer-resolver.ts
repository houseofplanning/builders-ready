import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from './supabase-server';

/**
 * A "customer" is simply a signed-in user. In the marketplace they own their
 * own job_requests (customer_id = auth.uid()). Unlike a trade they have no
 * tenant membership — but we don't *require* the absence of one here, because
 * posting a job is harmless for anyone signed in.
 */
export interface CurrentCustomer {
  user_id: string;
  email: string;
  full_name: string | null;
}

export async function resolveCurrentCustomer(): Promise<CurrentCustomer | null> {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', auth.user.id)
    .maybeSingle();

  return {
    user_id: auth.user.id,
    email: profile?.email ?? auth.user.email ?? '',
    full_name: profile?.full_name ?? null,
  };
}

export async function requireCustomer(): Promise<CurrentCustomer> {
  const customer = await resolveCurrentCustomer();
  if (!customer) redirect('/login');
  return customer;
}

/**
 * Is the signed-in user an *invited project client* (a tenant member with
 * role 'client') rather than a marketplace customer (no membership)?
 *
 * This mirrors the mobile app, where membership is the discriminator: a user
 * with no tenant membership gets the marketplace (`/customer`); a project
 * client gets the project-only shell with no marketplace. On web we use this
 * to strip the marketplace chrome (Post a job / Browse) for invited clients
 * and land them on their project instead.
 *
 * Returns false for marketplace customers and for anyone not signed in.
 */
export async function isInvitedClient(): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  return membership?.role === 'client';
}
