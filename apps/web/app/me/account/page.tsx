import Link from 'next/link';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { signOutAction } from '@/lib/server-actions/auth';

export default async function CustomerAccountPage() {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', me.user_id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Account</h1>
      <p className="mt-1 text-sm text-ink-muted">Your details and settings.</p>

      <div className="mt-6 rounded-card border border-hairline bg-white p-6">
        <Row label="Name" value={profile?.full_name ?? '—'} />
        <div className="my-3 border-t border-hairline" />
        <Row label="Email" value={profile?.email ?? '—'} />
        <div className="my-3 border-t border-hairline" />
        <Row label="Phone" value={profile?.phone ?? 'Not set'} />
      </div>

      <div className="mt-4 space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between rounded-card border border-hairline bg-white px-5 py-4 text-sm font-semibold text-ink transition hover:border-primary/40"
        >
          <span>View the public Builders Ready site</span>
          <span className="text-primary">↗</span>
        </Link>
        <Link
          href="/me/messages"
          className="flex items-center justify-between rounded-card border border-hairline bg-white px-5 py-4 text-sm font-semibold text-ink transition hover:border-primary/40"
        >
          <span>Messages</span>
          <span className="text-primary">→</span>
        </Link>
      </div>

      <form action={signOutAction} className="mt-6">
        <button className="rounded-lg border border-hairline px-5 py-2.5 text-sm font-semibold text-error hover:bg-canvas">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
