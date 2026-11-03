import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { planningRadarEntitled, encodePlanningId } from '@/lib/planning';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    tab?: string;
    postcode?: string;
    distance?: string;
    status?: string;
    work?: string;
  }>;
}

interface Listing {
  id: string;
  authority: string | null;
  address: string;
  postcode: string | null;
  description: string | null;
  work_category: string | null;
  status: string;
  validated_date: string | null;
  distance_km: number | null;
}

const DISTANCE_OPTIONS = [
  { label: 'Within ½ mile', value: '0.8' },
  { label: 'Within 1 mile', value: '1.6' },
  { label: 'Within 3 miles', value: '4.8' },
  { label: 'Within 5 miles', value: '8' },
  { label: 'Within 10 miles', value: '16' },
  { label: 'Within 15 miles', value: '24' },
];
const STATUS_OPTIONS = [
  { label: 'Approved + new', value: 'approved,pending' },
  { label: 'Approved only', value: 'approved' },
  { label: 'New / pending', value: 'pending' },
  { label: 'All statuses', value: '' },
];
const WORK_OPTIONS = [
  'Rear extension', 'Side extension', 'Two-storey extension', 'Wraparound extension',
  'Extension', 'Loft conversion', 'Dormer', 'Basement', 'Garage conversion',
  'Outbuilding / garden room', 'Porch', 'New dwelling',
];

function miles(km: number | null): string {
  if (km == null) return '';
  const mi = km * 0.621371;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'approved': return { label: 'APPROVED', cls: 'bg-green-100 text-green-700' };
    case 'pending': return { label: 'NEW', cls: 'bg-amber-100 text-amber-700' };
    case 'refused': return { label: 'REFUSED', cls: 'bg-red-100 text-red-700' };
    case 'withdrawn': return { label: 'WITHDRAWN', cls: 'bg-gray-100 text-gray-600' };
    default: return { label: 'OTHER', cls: 'bg-gray-100 text-gray-600' };
  }
}

async function geocode(pc: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const raw = pc.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!raw) return null;
  const full = raw.replace(/\s+/g, '');
  const urls = [
    `https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`,
    `https://api.postcodes.io/outcodes/${encodeURIComponent(full.replace(/\d[A-Z]{2}$/, '').trim() || full)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json?.result;
      if (r && typeof r.latitude === 'number' && typeof r.longitude === 'number') {
        return { lat: r.latitude, lon: r.longitude, label: raw };
      }
    } catch {
      // next
    }
  }
  return null;
}

export default async function PlanningRadarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const sp = await searchParams;
  const tab = sp.tab === 'pipeline' ? 'pipeline' : 'browse';
  const distance = sp.distance ?? '8';
  const statusCsv = sp.status ?? 'approved,pending';
  const work = sp.work ?? '';
  const postcode = sp.postcode ?? '';

  const isTrade = planningRadarEntitled(role);
  const supabase = await createSupabaseServer();

  let listings: Listing[] = [];
  let geo: { lat: number; lon: number; label: string } | null = null;
  let searched = false;

  if (isTrade && tab === 'browse' && postcode.trim()) {
    searched = true;
    geo = await geocode(postcode);
    if (geo) {
      // Ingest is national-by-date, so no per-area registration is needed.
      const statuses = statusCsv ? statusCsv.split(',').map((s) => s.trim()).filter(Boolean) : null;
      const { data } = await supabase.rpc('search_planning_listings', {
        p_lat: geo.lat,
        p_lon: geo.lon,
        p_radius_km: Number(distance),
        p_work_categories: work ? [work] : null,
        p_statuses: statuses,
        p_limit: 120,
        p_offset: 0,
      });
      listings = (data ?? []) as Listing[];
    }
  }

  // Pipeline tab
  let pipeline: { stage: string; listing: Listing }[] = [];
  if (isTrade && tab === 'pipeline') {
    const { data } = await supabase
      .from('planning_listing_actions')
      .select('stage, listing:planning_listings(id, authority, address, postcode, description, work_category, status, validated_date)')
      .eq('tenant_id', tenant.id)
      .neq('stage', 'not_interested')
      .order('updated_at', { ascending: false });
    pipeline = ((data ?? []) as unknown as { stage: string; listing: Listing }[]).filter((r) => r.listing);
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Planning Radar</h1>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        See planning jobs being planned near you and get in front of the homeowner first. Included in your subscription.
      </p>

      {!isTrade ? (
        <div className="rounded-xl border border-hairline bg-white p-6 text-sm text-ink-muted">
          Planning Radar is for trade accounts.
        </div>
      ) : (
        <>
          {/* Browse / Pipeline tabs */}
          <div className="mb-5 inline-flex rounded-lg border border-hairline p-1">
            <Link
              href={`/${slug}/planning-radar`}
              className={`rounded-md px-4 py-1.5 text-sm font-bold ${tab === 'browse' ? 'bg-primary text-white' : 'text-ink-muted'}`}
            >
              Browse
            </Link>
            <Link
              href={`/${slug}/planning-radar?tab=pipeline`}
              className={`rounded-md px-4 py-1.5 text-sm font-bold ${tab === 'pipeline' ? 'bg-primary text-white' : 'text-ink-muted'}`}
            >
              My pipeline
            </Link>
          </div>

          {tab === 'browse' ? (
            <>
              <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Your area</span>
                  <input
                    name="postcode"
                    defaultValue={postcode}
                    placeholder="e.g. M1"
                    autoComplete="postal-code"
                    className="w-36 rounded-lg border border-hairline bg-white px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-ink-muted focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Distance</span>
                  <select name="distance" defaultValue={distance} className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    {DISTANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Status</span>
                  <select name="status" defaultValue={statusCsv} className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Work type</span>
                  <select name="work" defaultValue={work} className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    <option value="">All work types</option>
                    {WORK_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </label>
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Search</button>
              </form>

              {!searched ? (
                <div className="rounded-xl border border-hairline bg-white p-6 text-sm text-ink-muted">
                  Enter your area and search to see planning jobs being planned near you.
                </div>
              ) : !geo ? (
                <div className="rounded-xl border border-hairline bg-white p-6 text-sm text-ink-muted">
                  We couldn&apos;t find that postcode. Try the full postcode or the area code (e.g. M1).
                </div>
              ) : listings.length === 0 ? (
                <div className="rounded-xl border border-hairline bg-white p-6 text-sm text-ink-muted">
                  No planning jobs here yet. We&apos;re now watching this area — new applications appear within a day. Try a wider distance or clear the work-type filter.
                </div>
              ) : (
                <>
                  <div className="mb-3 text-xs font-semibold text-ink-muted">
                    {listings.length} within {miles(Number(distance))}{geo ? ` of ${geo.label}` : ''}
                  </div>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((l) => {
                      const b = statusBadge(l.status);
                      return (
                        <li key={l.id}>
                          <Link href={`/${slug}/planning-radar/${encodePlanningId(l.id)}`} className="block h-full rounded-xl border border-hairline bg-white p-4 transition hover:border-primary">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="rounded-md bg-canvas px-2 py-1 text-[11px] font-bold text-primary">{l.work_category ?? 'Planning'}</span>
                              <span className={`rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${b.cls}`}>{b.label}</span>
                            </div>
                            <div className="text-sm font-extrabold text-ink">{l.address}</div>
                            <div className="mt-1 text-xs text-ink-muted">{[miles(l.distance_km), l.authority].filter(Boolean).join(' · ')}</div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </>
          ) : pipeline.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-white p-6 text-sm text-ink-muted">
              Nothing saved yet. Open a planning job and save it or mark it approached to track it here.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pipeline.map((p) => (
                <li key={p.listing.id}>
                  <Link href={`/${slug}/planning-radar/${encodePlanningId(p.listing.id)}`} className="block h-full rounded-xl border border-hairline bg-white p-4 transition hover:border-primary">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-md bg-canvas px-2 py-1 text-[11px] font-bold text-primary">{p.listing.work_category ?? 'Planning'}</span>
                      <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold capitalize text-white">{p.stage.replace('_', ' ')}</span>
                    </div>
                    <div className="text-sm font-extrabold text-ink">{p.listing.address}</div>
                    <div className="mt-1 text-xs text-ink-muted">{p.listing.authority}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
