import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { budgetLabel, relativeTime, TRADE_CATEGORIES } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; area?: string }>;
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
  created_at: string;
}

export default async function FindWorkPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tenant } = await requireTenantBySlug(slug);
  const { category, area } = await searchParams;

  const supabase = await createSupabaseServer();
  let q = supabase
    .from('job_requests')
    .select(
      'id, title, trade_category, postcode, city, budget_min_pence, budget_max_pence, budget_note, created_at',
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(60);
  if (category) q = q.eq('trade_category', category);
  if (area && area.trim()) q = q.ilike('postcode', `${area.trim().toUpperCase()}%`);

  const { data } = await q;
  const rows = (data ?? []) as JobRow[];

  const { data: myBids } = await supabase
    .from('bids')
    .select('job_request_id')
    .eq('tenant_id', tenant.id);
  const bidSet = new Set((myBids ?? []).map((b) => b.job_request_id as string));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-10">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Find work</h1>
        <span className="text-sm text-ink-muted">{rows.length} open</span>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        New jobs posted by homeowners. Bidding is included in your subscription — no per-lead fee.
      </p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
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
            Area (postcode)
          </span>
          <input
            name="area"
            defaultValue={area ?? ''}
            placeholder="e.g. SW"
            className="w-32 rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase focus:border-primary focus:outline-none"
          />
        </label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
          Filter
        </button>
        {(category || area) && (
          <Link href={`/${slug}/find-work`} className="text-sm font-semibold text-ink-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
          No open jobs match that filter right now. Check back soon.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((j) => (
            <li key={j.id}>
              <Link
                href={`/${slug}/find-work/${j.id}`}
                className="block rounded-card border border-hairline bg-white p-5 transition hover:border-primary/40"
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
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-extrabold text-ink">
                    {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                  </span>
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      bidSet.has(j.id)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'border border-primary text-primary'
                    }`}
                  >
                    {bidSet.has(j.id) ? 'Bid submitted' : 'View & bid →'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
