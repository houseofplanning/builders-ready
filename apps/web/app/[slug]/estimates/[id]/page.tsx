import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import {
  gbp,
  formatDate,
  marginPercent,
  ESTIMATE_LINE_KIND_LABELS,
  VAT_MODE_NOTE,
} from '@br/shared';
import type { Estimate, EstimateLineItem, EstimateStatus } from '@br/shared';
import { DeleteEstimateButton } from './delete-estimate-button';
import { DuplicateEstimateButton } from './duplicate-estimate-button';
import { EstimateSendPanel } from './estimate-send-panel';
import { ConvertToProjectPanel } from './convert-to-project-panel';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

const STATUS_STYLES: Record<EstimateStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-canvas text-ink-muted' },
  sent: { label: 'Sent', cls: 'bg-[#E6F0FA] text-[#2563A8]' },
  accepted: { label: 'Accepted', cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
  declined: { label: 'Declined', cls: 'bg-[#FAECE7] text-[#B23B1D]' },
  expired: { label: 'Expired', cls: 'bg-canvas text-ink-muted' },
};

export default async function EstimateDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const { role } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: estRow } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!estRow) notFound();
  const estimate = estRow as Estimate;

  const { data: lineRows } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', id)
    .order('position', { ascending: true });
  const lines = (lineRows ?? []) as EstimateLineItem[];

  const canManage = role === 'owner' || role === 'pm';
  const isDraft = estimate.status === 'draft';
  const s = STATUS_STYLES[estimate.status] ?? STATUS_STYLES.draft;
  const vatNote = VAT_MODE_NOTE[estimate.vat_mode];
  const marginPence =
    Number(estimate.subtotal_pence) - Number(estimate.cost_subtotal_pence);
  const site = [estimate.site_address_line1, estimate.city, estimate.postcode]
    .filter(Boolean)
    .join(', ');
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://buildersready.uk';
  const viewUrl = estimate.accept_token
    ? `${appBase}/q/${estimate.accept_token}`
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start gap-4">
        <div>
          <Link
            href={`/${slug}/estimates`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ← Quotes
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              {estimate.number}
            </span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.cls}`}
            >
              {s.label}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {estimate.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {estimate.client_name}
            {site ? ` · ${site}` : ''}
          </p>
        </div>
        {canManage && (
          <div className="ml-auto flex items-center gap-2">
            {isDraft && (
              <Link
                href={`/${slug}/estimates/${id}/edit`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Edit
              </Link>
            )}
            <DuplicateEstimateButton id={id} slug={slug} />
            {isDraft && <DeleteEstimateButton id={id} slug={slug} />}
          </div>
        )}
      </header>

      {/* LINES */}
      <div className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
        <div className="border-b border-hairline px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          Cost build-up
        </div>
        {lines.length === 0 ? (
          <div className="px-5 py-4 text-sm text-ink-muted">No lines.</div>
        ) : (
          lines.map((l, i) => (
            <div
              key={l.id}
              className={`flex items-center gap-4 px-5 py-3 ${
                i > 0 ? 'border-t border-hairline' : ''
              }`}
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-ink">{l.description}</div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {ESTIMATE_LINE_KIND_LABELS[l.kind]} · {Number(l.quantity)}{' '}
                  {l.unit}
                  {Number(l.markup_percent) > 0
                    ? ` · +${Number(l.markup_percent)}%`
                    : ''}
                </div>
              </div>
              <div className="text-sm font-extrabold text-ink">
                {gbp(Number(l.line_price_pence))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TOTALS */}
      <div className="mt-4 rounded-card border border-hairline bg-white p-5 shadow-card">
        <div className="flex items-center justify-between py-0.5 text-sm">
          <span className="font-semibold text-ink-muted">Subtotal</span>
          <span className="font-bold text-ink">
            {gbp(Number(estimate.subtotal_pence))}
          </span>
        </div>
        {estimate.vat_mode === 'standard' && (
          <div className="flex items-center justify-between py-0.5 text-sm">
            <span className="font-semibold text-ink-muted">VAT (20%)</span>
            <span className="font-bold text-ink">
              {gbp(Number(estimate.vat_pence))}
            </span>
          </div>
        )}
        <div className="my-2 h-px bg-hairline" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold uppercase tracking-wide text-ink">
            Total
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-ink">
            {gbp(Number(estimate.total_pence))}
          </span>
        </div>
        {canManage && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Your margin: {gbp(marginPence)} (
            {Math.round(
              marginPercent({
                cost_subtotal_pence: Number(estimate.cost_subtotal_pence),
                subtotal_pence: Number(estimate.subtotal_pence),
                vat_pence: Number(estimate.vat_pence),
                total_pence: Number(estimate.total_pence),
                margin_pence: marginPence,
              }),
            )}
            %)
          </p>
        )}
        {vatNote && (
          <p className="mt-2 text-[11px] italic text-ink-muted">{vatNote}</p>
        )}
      </div>

      {estimate.notes && (
        <div className="mt-4 rounded-card border border-hairline bg-white p-5 shadow-card">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Notes
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{estimate.notes}</p>
        </div>
      )}

      {estimate.valid_until && (
        <p className="mt-4 text-xs text-ink-muted">
          Valid until {formatDate(estimate.valid_until)}
        </p>
      )}

      {canManage && (
        <div className="mt-6">
          <EstimateSendPanel
            id={id}
            status={estimate.status}
            viewUrl={viewUrl}
            hasPdf={!!estimate.pdf_storage_path}
          />
        </div>
      )}

      {canManage && (
        <div className="mt-4">
          {estimate.project_id ? (
            <div className="rounded-card border border-hairline bg-white p-4 text-sm shadow-card">
              <span className="text-ink-muted">
                This quote has been converted into a project.{' '}
              </span>
              <Link
                href={`/${slug}/projects/${estimate.project_id}`}
                className="font-semibold text-primary hover:underline"
              >
                View project →
              </Link>
            </div>
          ) : (
            <ConvertToProjectPanel
              id={id}
              slug={slug}
              defaultAddress1={estimate.site_address_line1 ?? ''}
              defaultCity={estimate.city ?? ''}
              defaultPostcode={estimate.postcode ?? ''}
            />
          )}
        </div>
      )}
    </div>
  );
}
