import Link from 'next/link';
import { budgetLabel, jobRequestStatusLabel, type JobRequestStatus } from '@br/shared';
import { createSupabaseServer } from '@/lib/supabase-server';
import { requireCustomer } from '@/lib/customer-resolver';

interface Row {
  id: string;
  title: string;
  trade_category: string;
  status: JobRequestStatus;
  created_at: string;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  bids: { count: number }[] | null;
}

const STATUS_STYLE: Record<JobRequestStatus, string> = {
  open: 'bg-primary/10 text-primary',
  matched: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-ink/10 text-ink-muted',
  expired: 'bg-ink/10 text-ink-muted',
  cancelled: 'bg-ink/10 text-ink-muted',
};

export default async function CustomerHome() {
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, status, created_at, budget_min_pence, budget_max_pence, budget_note, bids(count)',
    )
    .eq('customer_id', me.user_id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your requests</h1>
          <p className="mt-1 text-sm text-ink-muted">Jobs you&rsquo;ve posted.</p>
        </div>
        <Link
          href="/me/post"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          + Post a job
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center">
          <p className="text-base font-bold text-ink">No requests yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Post your first job and local trades will come to you. It&rsquo;s free.
          </p>
          <Link
            href="/me/post"
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            Post a job
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const quotes = r.bids?.[0]?.count ?? 0;
            return (
              <li key={r.id}>
                <Link
                  href={`/me/requests/${r.id}`}
                  className="flex items-center justify-between rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
                >
                  <div>
                    <div className="text-base font-extrabold text-ink">{r.title}</div>
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {r.trade_category} ·{' '}
                      {budgetLabel(r.budget_min_pence, r.budget_max_pence, r.budget_note)}
                    </div>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[r.status]}`}
                    >
                      {jobRequestStatusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-right text-sm font-bold text-primary">
                    {quotes} {quotes === 1 ? 'quote' : 'quotes'} →
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
