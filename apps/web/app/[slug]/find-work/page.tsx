import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { budgetLabel, relativeTime, TRADE_CATEGORIES, MARKETPLACE_BID_CAP, postcodeMatches } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; category?: string; area?: string }>;
}

interface JobRow {
  id: string;
  title: string;
  trade_category: string;
  postcode: string;
  city: string | null;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  bid_count: number;
  created_at: string;
}

interface WonRow {
  job_id: string;
  title: string;
  trade_category: string;
  city: string | null;
  postcode: string;
  amount_pence: number | null;
  project_id: string | null;
  project_status: string | null;
}

export default async function FindWorkPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tenant } = await requireTenantBySlug(slug);
  const sp = await searchParams;
  const tab = sp.tab === 'hired' || sp.tab === 'completed' ? sp.tab : 'open';
  const { category, area } = sp;

  const supabase = await createSupabaseServer();

  // ---- OPEN jobs to bid on ----
  let openRows: JobRow[] = [];
  const bidSet = new Set<string>();
  if (tab === 'open') {
    let q = supabase
      .from('open_jobs_feed')
      .select(
        'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, bid_count, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(60);
    if (category) q = q.eq('trade_category', category);
    const { data } = await q;
    const all = (data ?? []) as JobRow[];
    // Free-text postcode search — prefix match on the posted postcode, UK-wide.
    openRows = area ? all.filter((r) => postcodeMatches(r.postcode, area)) : all;

    const { data: myBids } = await supabase
      .from('bids')
      .select('job_request_id')
      .eq('tenant_id', tenant.id);
    (myBids ?? []).forEach((b) => bidSet.add(b.job_request_id as string));
  }

  // ---- HIRED / COMPLETED (jobs this trade won) ----
  let wonRows: WonRow[] = [];
  if (tab !== 'open') {
    const { data: accepted } = await supabase
      .from('bids')
      .select('amount_pence, job_request_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'accepted');
    const amountByJob = new Map(
      (accepted ?? []).map((b) => [b.job_request_id as string, b.amount_pence as number | null]),
    );
    const jobIds = [...amountByJob.keys()];
    if (jobIds.length) {
      const { data: jobs } = await supabase
        .from('job_requests')
        .select('id, title, trade_category, city, postcode, matched_project_id, updated_at')
        .in('id', jobIds)
        .order('updated_at', { ascending: false });
      const projIds = (jobs ?? [])
        .map((j) => j.matched_project_id)
        .filter(Boolean) as string[];
      const statusByProject = new Map<string, string>();
      if (projIds.length) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, status')
          .in('id', projIds);
        (projs ?? []).forEach((p) => statusByProject.set(p.id as string, p.status as string));
      }
      wonRows = (jobs ?? []).map((j) => ({
        job_id: j.id as string,
        title: j.title as string,
        trade_category: j.trade_category as string,
        city: j.city as string | null,
        postcode: j.postcode as string,
        amount_pence: amountByJob.get(j.id as string) ?? null,
        project_id: j.matched_project_id as string | null,
        project_status: j.matched_project_id
          ? statusByProject.get(j.matched_project_id as string) ?? null
          : null,
      }));
    }
    wonRows = wonRows.filter((w) =>
      tab === 'completed' ? w.project_status === 'completed' : w.project_status !== 'completed',
    );
  }

  const tabs: { key: string; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'hired', label: 'Hired' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Marketplace</h1>
        {tab === 'open' && <span className="text-sm text-ink-muted">{openRows.length} open</span>}
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        New jobs posted by homeowners. Bidding is included in your subscription — no per-lead fee.
      </p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Show
          </span>
          <select
            name="tab"
            defaultValue={tab}
            className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {tabs.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {tab === 'open' && (
          <>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Trade
              </span>
              <select
                name="category"
                defaultValue={category ?? ''}
                className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">All trades</option>
                {TRADE_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Postcode
              </span>
              <input
                name="area"
                type="text"
                autoComplete="postal-code"
                defaultValue={area ?? ''}
                placeholder="e.g. SW19"
                className="w-32 rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-ink-muted focus:border-primary focus:outline-none"
              />
            </label>
          </>
        )}
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
          Apply
        </button>
        {(category || area || tab !== 'open') && (
          <Link href={`/${slug}/find-work`} className="text-sm font-semibold text-ink-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {tab === 'open' ? (
        openRows.length === 0 ? (
          <EmptyBox>No open jobs match that filter right now. Check back soon.</EmptyBox>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {openRows.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/${slug}/find-work/${j.id}`}
                  className="flex h-full flex-col rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between">
                    <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {j.trade_category}
                    </span>
                    <span className="text-xs text-ink-muted">{relativeTime(j.created_at)}</span>
                  </div>
                  <div className="mt-3 text-lg font-extrabold text-ink">{j.title}</div>
                  <div className="mt-0.5 text-sm text-ink-muted">
                    {[j.city, j.postcode].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-ink-muted">
                    {j.bid_count >= MARKETPLACE_BID_CAP
                      ? 'Fully quoted'
                      : `${j.bid_count} of ${MARKETPLACE_BID_CAP} quotes`}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-base font-extrabold text-ink">
                      {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                    </span>
                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        bidSet.has(j.id)
                          ? 'bg-emerald-100 text-emerald-700'
                          : j.bid_count >= MARKETPLACE_BID_CAP
                            ? 'bg-canvas text-ink-muted'
                            : 'border border-primary text-primary'
                      }`}
                    >
                      {bidSet.has(j.id)
                        ? 'Bid submitted'
                        : j.bid_count >= MARKETPLACE_BID_CAP
                          ? 'Fully quoted'
                          : 'View & bid →'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : wonRows.length === 0 ? (
        <EmptyBox>
          {tab === 'hired'
            ? 'No active hired jobs yet. Win a bid and it shows here.'
            : 'No completed jobs yet.'}
        </EmptyBox>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {wonRows.map((w) => (
            <li key={w.job_id}>
              <Link
                href={w.project_id ? `/${slug}/projects/${w.project_id}` : `/${slug}/find-work`}
                className="flex h-full flex-col rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {w.trade_category}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {w.project_status === 'completed' ? 'Completed' : 'In progress'}
                  </span>
                </div>
                <div className="mt-3 text-lg font-extrabold text-ink">{w.title}</div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  {[w.city, w.postcode].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-base font-extrabold text-ink">
                    {w.amount_pence != null ? budgetLabel(w.amount_pence, w.amount_pence) : '—'}
                  </span>
                  <span className="text-xs font-bold text-primary">Open project →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}
