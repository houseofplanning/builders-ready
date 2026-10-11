import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { budgetLabel, relativeTime, jobTimingLabel, propertyTypeLabel, MARKETPLACE_BID_CAP, type BidStatus } from '@br/shared';
import { MessageButton } from '@/components/marketplace/message-button';
import { BidForm } from './bid-form';

interface Props {
  params: Promise<{ slug: string; jobId: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { slug, jobId } = await params;
  const { tenant } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: job } = await supabase
    .from('job_requests')
    .select(
      'id, customer_id, trade_category, title, description, city, postcode, budget_min_pence, budget_max_pence, budget_note, photos, timing, property_type, preferred_start_date, access_notes, status, created_at',
    )
    .eq('id', jobId)
    .maybeSingle();
  if (!job) notFound();

  const { data: myBid } = await supabase
    .from('bids')
    .select('id, amount_pence, message, status')
    .eq('job_request_id', jobId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  const { data: feedRow } = await supabase
    .from('open_jobs_feed')
    .select('bid_count')
    .eq('id', jobId)
    .maybeSingle();
  const bidCount = Number(feedRow?.bid_count ?? 0);
  const isFull = bidCount >= MARKETPLACE_BID_CAP;

  // First name only (privacy) — fetched via admin to avoid exposing profiles.
  const admin = getSupabaseAdmin();
  const { data: poster } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', job.customer_id)
    .maybeSingle();
  const firstName = poster?.full_name?.split(/\s+/)[0] ?? 'A homeowner';

  const JobFact = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );

  const bidStatusLabel: Record<BidStatus, string> = {
    submitted: 'Submitted',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted — you won this job',
    declined: 'Not selected',
    withdrawn: 'Withdrawn',
  };

  return (
    <div className="w-full">
      <Link href={`/${slug}/find-work`} className="text-sm font-bold text-primary hover:underline">
        ‹ Marketplace
      </Link>

      <span className="mt-4 inline-block rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {job.trade_category}
      </span>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{job.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {firstName} · {[job.city, job.postcode].filter(Boolean).join(' · ')} · posted{' '}
        {relativeTime(job.created_at)}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT — the job itself */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card border border-hairline bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Budget</div>
              <div className="mt-1 text-lg font-extrabold text-ink">
                {budgetLabel(job.budget_min_pence, job.budget_max_pence, job.budget_note)}
              </div>
            </div>
            <div className="rounded-card border border-hairline bg-white p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Quotes</div>
              <div className="mt-1 text-lg font-extrabold text-ink">
                {job.status !== 'open'
                  ? 'Closed'
                  : isFull
                    ? 'Fully quoted'
                    : `${bidCount} of ${MARKETPLACE_BID_CAP}`}
              </div>
            </div>
          </div>

          {(job.timing || job.property_type || job.preferred_start_date || job.access_notes) && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-card border border-hairline bg-white p-4 text-sm sm:grid-cols-4">
              {job.timing && (
                <JobFact label="Timing" value={jobTimingLabel(job.timing) ?? job.timing} />
              )}
              {job.property_type && (
                <JobFact label="Property" value={propertyTypeLabel(job.property_type) ?? job.property_type} />
              )}
              {job.preferred_start_date && (
                <JobFact label="Preferred start" value={job.preferred_start_date} />
              )}
              {job.access_notes && (
                <div className="col-span-2 sm:col-span-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Access & availability
                  </div>
                  <div className="mt-0.5 text-sm text-ink">{job.access_notes}</div>
                </div>
              )}
            </div>
          )}

          {Array.isArray(job.photos) && job.photos.length > 0 && (
            <div className="mt-5 flex gap-3 overflow-x-auto">
              {(job.photos as string[]).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Job photo"
                  className="h-40 w-56 flex-none rounded-card border border-hairline object-cover"
                />
              ))}
            </div>
          )}

          {job.description && (
            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">The job</div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                {job.description}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — act on it */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-4">
            <MessageButton kind="job" id={job.id} label="Message the customer" />
          </div>
          {myBid ? (
            <div className="rounded-card border border-hairline bg-white p-5">
              <div className="text-sm font-extrabold text-ink">Your bid</div>
              <div className="mt-1 text-sm text-ink-muted">
                {myBid.amount_pence ? budgetLabel(myBid.amount_pence, myBid.amount_pence) : 'Quote sent'}{' '}
                · {bidStatusLabel[myBid.status as BidStatus]}
              </div>
              {myBid.message && <p className="mt-2 text-sm text-ink">{myBid.message}</p>}
            </div>
          ) : job.status === 'open' && !isFull ? (
            <BidForm jobId={job.id} />
          ) : (
            <div className="rounded-card border border-hairline bg-white p-5 text-sm text-ink-muted">
              {job.status === 'open' && isFull
                ? `This job is fully quoted (${MARKETPLACE_BID_CAP} of ${MARKETPLACE_BID_CAP}). Check back if a slot frees up.`
                : 'This job is no longer accepting bids.'}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
