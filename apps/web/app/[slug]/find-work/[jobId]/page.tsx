import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { budgetLabel, relativeTime, type BidStatus } from '@br/shared';
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
      'id, customer_id, trade_category, title, description, city, postcode, budget_min_pence, budget_max_pence, budget_note, status, created_at',
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

  // First name only (privacy) — fetched via admin to avoid exposing profiles.
  const admin = getSupabaseAdmin();
  const { data: poster } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', job.customer_id)
    .maybeSingle();
  const firstName = poster?.full_name?.split(/\s+/)[0] ?? 'A homeowner';

  const bidStatusLabel: Record<BidStatus, string> = {
    submitted: 'Submitted',
    shortlisted: 'Shortlisted',
    accepted: 'Accepted — you won this job',
    declined: 'Not selected',
    withdrawn: 'Withdrawn',
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8 lg:px-10">
      <Link href={`/${slug}/find-work`} className="text-sm font-bold text-primary hover:underline">
        ‹ Find work
      </Link>

      <span className="mt-4 inline-block rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {job.trade_category}
      </span>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{job.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {firstName} · {[job.city, job.postcode].filter(Boolean).join(' · ')} · posted{' '}
        {relativeTime(job.created_at)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-hairline bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Budget</div>
          <div className="mt-1 text-lg font-extrabold text-ink">
            {budgetLabel(job.budget_min_pence, job.budget_max_pence, job.budget_note)}
          </div>
        </div>
        <div className="rounded-card border border-hairline bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status</div>
          <div className="mt-1 text-lg font-extrabold text-ink">
            {job.status === 'open' ? 'Open' : 'No longer open'}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <MessageButton kind="job" id={job.id} label="Message the customer" />
      </div>

      {job.description && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">The job</div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
            {job.description}
          </p>
        </div>
      )}

      <div className="mt-7">
        {myBid ? (
          <div className="rounded-card border border-hairline bg-white p-5">
            <div className="text-sm font-extrabold text-ink">Your bid</div>
            <div className="mt-1 text-sm text-ink-muted">
              {myBid.amount_pence ? budgetLabel(myBid.amount_pence, myBid.amount_pence) : 'Quote sent'}{' '}
              · {bidStatusLabel[myBid.status as BidStatus]}
            </div>
            {myBid.message && <p className="mt-2 text-sm text-ink">{myBid.message}</p>}
          </div>
        ) : job.status === 'open' ? (
          <BidForm jobId={job.id} />
        ) : (
          <div className="rounded-card border border-hairline bg-white p-5 text-sm text-ink-muted">
            This job is no longer accepting bids.
          </div>
        )}
      </div>
    </div>
  );
}
