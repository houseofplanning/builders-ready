import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  budgetLabel,
  jobRequestStatusLabel,
  relativeTime,
  type JobRequestStatus,
  type BidStatus,
} from '@br/shared';
import { MessageButton } from '@/components/marketplace/message-button';
import { BidActions } from './bid-actions';

interface Props {
  params: Promise<{ id: string }>;
}

interface BidRow {
  id: string;
  tenant_id: string;
  amount_pence: number | null;
  message: string | null;
  status: BidStatus;
  created_at: string;
}

export default async function RequestDetailPage({ params }: Props) {
  const { id } = await params;
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: job } = await supabase
    .from('job_requests')
    .select(
      'id, trade_category, title, description, city, postcode, budget_min_pence, budget_max_pence, budget_note, status, matched_project_id, created_at',
    )
    .eq('id', id)
    .eq('customer_id', me.user_id)
    .maybeSingle();
  if (!job) notFound();

  const { data: bidsRaw } = await supabase
    .from('bids')
    .select('id, tenant_id, amount_pence, message, status, created_at')
    .eq('job_request_id', id)
    .order('created_at', { ascending: true });
  const bids = (bidsRaw ?? []) as BidRow[];

  // Trade display info + ratings via admin — avoids exposing the tenants table.
  const tenantIds = [...new Set(bids.map((b) => b.tenant_id))];
  const admin = getSupabaseAdmin();
  const tradeName = new Map<string, string>();
  const ownerByTenant = new Map<string, string>();
  if (tenantIds.length) {
    const { data: trades } = await admin
      .from('tenants')
      .select('id, name, owner_user_id')
      .in('id', tenantIds);
    (trades ?? []).forEach((t) => {
      tradeName.set(t.id as string, t.name as string);
      if (t.owner_user_id) ownerByTenant.set(t.id as string, t.owner_user_id as string);
    });
  }
  // Average trade ratings (customer_to_trade), keyed back to tenant.
  const ratingByTenant = new Map<string, { avg: number; count: number }>();
  const ownerIds = [...new Set(ownerByTenant.values())];
  if (ownerIds.length) {
    const { data: revs } = await admin
      .from('marketplace_reviews')
      .select('reviewee_id, rating')
      .eq('direction', 'customer_to_trade')
      .in('reviewee_id', ownerIds);
    const byOwner = new Map<string, number[]>();
    (revs ?? []).forEach((r) => {
      const arr = byOwner.get(r.reviewee_id as string) ?? [];
      arr.push(r.rating as number);
      byOwner.set(r.reviewee_id as string, arr);
    });
    ownerByTenant.forEach((owner, tenantId) => {
      const arr = byOwner.get(owner);
      if (arr?.length) {
        ratingByTenant.set(tenantId, {
          avg: arr.reduce((a, b) => a + b, 0) / arr.length,
          count: arr.length,
        });
      }
    });
  }

  const isOpen = (job.status as JobRequestStatus) === 'open';
  const liveBids = bids.filter((b) => b.status !== 'withdrawn');

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/me" className="text-sm font-bold text-primary hover:underline">
        ‹ Your requests
      </Link>

      <span className="mt-4 inline-block rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {job.trade_category}
      </span>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{job.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {[job.city, job.postcode].filter(Boolean).join(' · ')} ·{' '}
        {budgetLabel(job.budget_min_pence, job.budget_max_pence, job.budget_note)} ·{' '}
        {jobRequestStatusLabel(job.status as JobRequestStatus)}
      </p>

      {!isOpen && (
        <div className="mt-5 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {job.status === 'matched' ? (
            <div className="flex items-center justify-between gap-3">
              <span>You&rsquo;ve hired a trade. Follow the build, approve changes and pay in your project.</span>
              {job.matched_project_id && (
                <Link
                  href={`/me/jobs/${job.matched_project_id}`}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white"
                >
                  Open project →
                </Link>
              )}
            </div>
          ) : (
            'This request is closed.'
          )}
        </div>
      )}

      <h2 className="mb-3 mt-7 text-lg font-extrabold text-ink">
        {liveBids.length} {liveBids.length === 1 ? 'quote' : 'quotes'}
      </h2>

      {liveBids.length === 0 ? (
        <div className="rounded-card border border-hairline bg-white p-8 text-center text-sm text-ink-muted">
          No quotes yet — trades usually respond within a day or two.
        </div>
      ) : (
        <ul className="space-y-3">
          {liveBids.map((b) => (
            <li key={b.id} className="rounded-card border border-hairline bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-extrabold text-ink">
                    {tradeName.get(b.tenant_id) ?? 'A trade'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                    {ratingByTenant.get(b.tenant_id) && (
                      <span className="font-semibold text-ink">
                        {ratingByTenant.get(b.tenant_id)!.avg.toFixed(1)} ★ (
                        {ratingByTenant.get(b.tenant_id)!.count})
                      </span>
                    )}
                    <span>{relativeTime(b.created_at)}</span>
                  </div>
                </div>
                <div className="text-right text-lg font-extrabold text-ink">
                  {b.amount_pence ? budgetLabel(b.amount_pence, b.amount_pence) : 'Quote'}
                </div>
              </div>
              {b.message && <p className="mt-2 text-sm text-ink">{b.message}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.status === 'accepted' && (
                  <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Hired
                  </span>
                )}
                {b.status === 'declined' && (
                  <span className="text-xs font-semibold text-ink-muted">Declined</span>
                )}
                {isOpen && b.status !== 'accepted' && b.status !== 'declined' && (
                  <BidActions bidId={b.id} />
                )}
                {!isOpen && b.status !== 'accepted' && b.status !== 'declined' && (
                  <span className="text-xs font-semibold text-ink-muted">Not selected</span>
                )}
                <MessageButton kind="bid" id={b.id} />
                {b.status === 'accepted' && job.matched_project_id && (
                  <Link
                    href={`/me/requests/${job.id}/review`}
                    className="rounded-lg border border-primary px-4 py-2 text-xs font-bold text-primary"
                  >
                    Leave a review
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
