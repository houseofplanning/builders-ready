import Link from 'next/link';
import { redirect } from 'next/navigation';
import { budgetLabel, relativeTime, TRADE_CATEGORIES, postcodeMatches } from '@br/shared';
import { createSupabaseServer } from '@/lib/supabase-server';
import { requireCustomer, isInvitedClient } from '@/lib/customer-resolver';

interface Props {
  searchParams: Promise<{ category?: string; area?: string }>;
}

interface FeedRow {
  id: string;
  title: string;
  trade_category: string;
  city: string | null;
  postcode: string;
  budget_min_pence: number | null;
  budget_max_pence: number | null;
  budget_note: string | null;
  photos: string[] | null;
  created_at: string;
}

export default async function BrowsePage({ searchParams }: Props) {
  const me = await requireCustomer();
  if (await isInvitedClient()) redirect('/me');
  const { category, area } = await searchParams;
  const supabase = await createSupabaseServer();

  let q = supabase
    .from('open_jobs_feed')
    .select(
      'id, title, trade_category, city, postcode, budget_min_pence, budget_max_pence, budget_note, photos, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(60);
  if (category) q = q.eq('trade_category', category);
  const { data } = await q;
  const all = (data ?? []) as FeedRow[];

  // Free-text postcode search — prefix match on the posted postcode, UK-wide.
  const rows = area ? all.filter((r) => postcodeMatches(r.postcode, area)) : all;

  // Flag the customer's own jobs (shown, but badged + linked to their request).
  const { data: mine } = await supabase
    .from('job_requests')
    .select('id')
    .eq('customer_id', me.user_id);
  const mineIds = new Set((mine ?? []).map((m) => m.id as string));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Browse the marketplace</h1>
        <span className="text-sm text-ink-muted">{rows.length} open</span>
      </div>
      <p className="mb-5 text-sm text-ink-muted">
        Open jobs other homeowners have posted near you. Add your own any time.
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
            Postcode
          </span>
          <input
            name="area"
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            defaultValue={area ?? ''}
            placeholder="e.g. SW19"
            className="w-32 rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-ink-muted focus:border-primary focus:outline-none"
          />
        </label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Filter</button>
        {(category || area) && (
          <Link href="/me/browse" className="text-sm font-semibold text-ink-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-10 text-center text-sm text-ink-muted">
          No open jobs match right now.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((j) => {
            const mine = mineIds.has(j.id);
            const card = (
              <>
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {j.trade_category}
                  </span>
                  {mine ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Your job
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">{relativeTime(j.created_at)}</span>
                  )}
                </div>
                {Array.isArray(j.photos) && j.photos.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={j.photos[0]}
                    alt=""
                    className="mt-3 h-36 w-full rounded-lg border border-hairline object-cover"
                  />
                )}
                <div className="mt-3 text-lg font-extrabold text-ink">{j.title}</div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  {[j.city, j.postcode].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-2 text-base font-extrabold text-ink">
                  {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                </div>
                {mine && (
                  <div className="mt-2 text-sm font-bold text-primary">View your quotes →</div>
                )}
              </>
            );
            return (
              <li key={j.id}>
                {mine ? (
                  <Link
                    href={`/me/requests/${j.id}`}
                    className="flex h-full flex-col rounded-card border border-primary/40 bg-white p-5 transition hover:border-primary"
                  >
                    {card}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-card border border-hairline bg-white p-5">
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
