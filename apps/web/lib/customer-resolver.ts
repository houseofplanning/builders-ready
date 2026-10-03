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
