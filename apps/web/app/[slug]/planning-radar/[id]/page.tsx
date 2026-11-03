import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@br/shared';
import { planningRadarEntitled, decodePlanningId } from '@/lib/planning';
import { PlanningActions } from './planning-actions';
import { PlanningLetter } from './planning-letter';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

interface Listing {
  id: string;
  authority: string | null;
  address: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  application_type: string | null;
  work_category: string | null;
  status: string;
  validated_date: string | null;
  decided_date: string | null;
  portal_url: string | null;
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

function templateKey(wc: string | null): string {
  switch (wc) {
    case 'Loft conversion':
    case 'Dormer': return 'loft_conversion';
    case 'Basement': return 'basement';
    case 'Garage conversion': return 'garage_conversion';
    case 'New dwelling':
    case 'Outbuilding / garden room': return 'new_build';
    case 'Rear extension':
    case 'Side extension':
    case 'Two-storey extension':
    case 'Wraparound extension':
    case 'Extension':
    case 'Porch': return 'extension';
    default: return 'full_renovation';
  }
}

function splitAddress(address: string, postcode: string | null): string {
  const pc = postcode?.trim() || null;
  let line1 = address.trim();
  if (pc && line1.toUpperCase().endsWith(pc.toUpperCase())) {
    line1 = line1.slice(0, line1.length - pc.length).replace(/[,\s]+$/, '').trim();
  }
  return line1;
}

function buildLetterDraft(l: Listing, businessName: string, phone: string | null): string {
  const work = (l.work_category ?? 'the work').toLowerCase();
  const line1 = splitAddress(l.address, l.postcode);
  const statusLine =
    l.status === 'approved'
      ? `I noticed planning permission has recently been granted for ${work} at ${line1}.`
      : `I noticed a planning application has recently been submitted for ${work} at ${line1}.`;
  return [
    `Dear neighbour,`,
    ``,
    statusLine,
    ``,
    `I'm a local builder and this is exactly the kind of work I do. If you haven't yet lined up someone to carry it out, I'd be glad to come and take a look and give you a free, no-obligation quote.`,
    ``,
    `There's no pressure at all — even if it's just to talk through your options and rough costs, I'm happy to help.`,
    ``,
    phone ? `You can reach me on ${phone}. I look forward to hearing from you.` : `I look forward to hearing from you.`,
    ``,
    `Kind regards,`,
    businessName,
  ].join('\n');
}

export default async function PlanningListingDetail({ params }: Props) {
  const { slug, id } = await params;
  const realId = decodePlanningId(id);
  const { tenant, role } = await requireTenantBySlug(slug);
  const isTrade = planningRadarEntitled(role);

  const supabase = await createSupabaseServer();
  const { data: listingRow } = await supabase
    .from('planning_listings')
    .select('id, authority, address, postcode, latitude, longitude, description, application_type, work_category, status, validated_date, decided_date, portal_url')
    .eq('id', realId)
    .maybeSingle();

  if (!isTrade || !listingRow) {
    return (
      <div className="w-full">
        <Link href={`/${slug}/planning-radar`} className="text-xs font-semibold text-primary hover:underline">← Planning Radar</Link>
        <p className="mt-4 text-sm text-ink-muted">This planning job could not be loaded.</p>
      </div>
    );
  }
  const listing = listingRow as Listing;

  const { data: action } = await supabase
    .from('planning_listing_actions')
    .select('stage')
    .eq('listing_id', realId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  const stage = (action?.stage as string) ?? null;

  const b = statusBadge(listing.status);
  const line1 = splitAddress(listing.address, listing.postcode);
  const quoteHref =
    `/${slug}/estimates/new?pt=${encodeURIComponent(templateKey(listing.work_category))}` +
    `&title=${encodeURIComponent(`${listing.work_category ?? 'Planning job'} — ${line1}`)}` +
    `&address=${encodeURIComponent(line1)}` +
    (listing.postcode ? `&postcode=${encodeURIComponent(listing.postcode)}` : '');
  const mapsQ = listing.latitude != null && listing.longitude != null
    ? `${listing.latitude},${listing.longitude}`
    : encodeURIComponent(listing.address);
  const letterBody = buildLetterDraft(listing, tenant.name, tenant.business_phone ?? null);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href={`/${slug}/planning-radar`} className="text-xs font-semibold text-primary hover:underline">← Planning Radar</Link>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-md border border-hairline bg-white px-3 py-1.5 text-sm font-bold text-primary">{listing.work_category ?? 'Planning'}</span>
        <span className={`rounded-md px-3 py-1.5 text-xs font-bold tracking-wide ${b.cls}`}>{b.label}</span>
      </div>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">{listing.address}</h1>
      <p className="mt-1 text-sm text-ink-muted">{[listing.postcode, listing.authority].filter(Boolean).join(' · ')}</p>

      <div className="mt-5 rounded-xl border border-hairline bg-white p-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">The work</div>
        <p className="text-sm leading-relaxed text-ink">{listing.description || 'No description provided in the planning record.'}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
          {listing.application_type && <span>Type: {listing.application_type}</span>}
          {listing.validated_date && <span>Submitted {formatDate(listing.validated_date)}</span>}
          {listing.decided_date && <span>Decided {formatDate(listing.decided_date)}</span>}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink">
        <span>✉️</span>
        <span>Pop a letter through the door or knock and introduce yourself. The homeowner here is planning work you do.</span>
      </div>

      <div className="mt-5 space-y-3">
        <Link href={quoteHref} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-white">
          Create a quote for this job
        </Link>

        <PlanningLetter listingId={listing.id} initialBody={letterBody} />

        <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQ}`} target="_blank" rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-white py-3 text-sm font-semibold text-ink hover:border-primary">
          Open in Maps &amp; get directions
        </a>

        {listing.portal_url && (
          <a href={listing.portal_url} target="_blank" rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-white py-3 text-sm font-semibold text-ink hover:border-primary">
            View official record
          </a>
        )}
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <PlanningActions listingId={listing.id} initialStage={stage} />
      </div>
    </div>
  );
}
