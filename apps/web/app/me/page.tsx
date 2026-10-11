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
  // NOTE: no `bids(count)` embed — that silently returns nothing under RLS,
  // which hid app-posted jobs on the web. Count quotes in a second query.
  const { data } = await supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, status, created_at, budget_min_pence, budget_max_pence, budget_note',
    )
    .eq('customer_id', me.user_id)
    .order('created_at', { ascending: false });

  const rows = (data ?? []) as Row[];

  // Builder-managed projects where this user is the client. Covers invited
  // clients (who never posted a marketplace job) and marketplace customers
  // whose job became a project. RLS lets a client read their own project.
  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, name, status, progress_percent, city, postcode')
    .eq('client_id', me.user_id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });
  const projects = (projectRows ?? []) as {
    id: string;
    name: string;
    status: string;
    progress_percent: number | null;
    city: string | null;
    postcode: string | null;
  }[];

  const quotesById = new Map<string, number>();
  if (rows.length) {
    const { data: bidRows } = await supabase
      .from('bids')
      .select('job_request_id')
      .in('job_request_id', rows.map((r) => r.id))
      .neq('status', 'withdrawn');
    (bidRows ?? []).forEach((b) => {
      const k = b.job_request_id as string;
      quotesById.set(k, (quotesById.get(k) ?? 0) + 1);
    });
  }

  return (
    <div>
      {projects.length > 0 && (
        <section className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Your projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live work your builder is managing. Tap in to follow the timeline,
            approve decisions and pay invoices.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const pct = Math.max(0, Math.min(100, Math.round(p.progress_percent ?? 0)));
              const statusLabel =
                p.status === 'on_hold'
                  ? 'On hold'
                  : p.status === 'completed'
                    ? 'Completed'
                    : 'Active';
              return (
                <li key={p.id}>
                  <Link
                    href={`/me/jobs/${p.id}`}
                    className="flex h-full flex-col rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-base font-extrabold text-ink">{p.name}</div>
                      <span className="whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        {statusLabel}
                      </span>
                    </div>
                    {(p.city || p.postcode) && (
                      <div className="mt-0.5 text-sm text-ink-muted">
                        {[p.city, p.postcode].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-canvas">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
            Post your first job and local trades will come to you.
          </p>
          <Link
            href="/me/post"
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            Post a job
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const quotes = quotesById.get(r.id) ?? 0;
            return (
              <li key={r.id}>
                <Link
                  href={`/me/requests/${r.id}`}
                  className="flex h-full items-center justify-between rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
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
