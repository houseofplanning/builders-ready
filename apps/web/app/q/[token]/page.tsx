import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  gbp,
  formatDate,
  ESTIMATE_LINE_KIND_LABELS,
  VAT_MODE_NOTE,
} from '@br/shared';
import type { Estimate, EstimateLineItem, Tenant } from '@br/shared';
import { AcceptQuoteForm } from './accept-quote-form';

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = 'force-dynamic';

/**
 * Public, unauthenticated quote view. Reached by the accept_token in the
 * shareable link. Reads via the service role (the prospect has no account),
 * exposing ONLY this one quote — and never the builder's cost or margin.
 */
export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data: estRow } = await admin
    .from('estimates')
    .select('*')
    .eq('accept_token', token)
    .maybeSingle();
  if (!estRow) notFound();
  const estimate = estRow as Estimate;

  const [{ data: lineRows }, { data: tenantRow }] = await Promise.all([
    admin
      .from('estimate_line_items')
      .select(
        'id, kind, description, quantity, unit, line_price_pence, position',
      )
      .eq('estimate_id', estimate.id)
      .order('position', { ascending: true }),
    admin
      .from('tenants')
      .select('name, logo_url, brand_primary, business_email, business_phone')
      .eq('id', estimate.tenant_id)
      .maybeSingle(),
  ]);
  const lines = (lineRows ?? []) as Pick<
    EstimateLineItem,
    'id' | 'kind' | 'description' | 'quantity' | 'unit' | 'line_price_pence'
  >[];
  const tenant = (tenantRow ?? { name: 'Your builder' }) as Partial<Tenant>;
  const primary = tenant.brand_primary || '#0F4C5C';

  let pdfUrl: string | null = null;
  if (estimate.pdf_storage_path) {
    const { data } = await admin.storage
      .from('estimate-pdfs')
      .createSignedUrl(estimate.pdf_storage_path, 3600);
    pdfUrl = data?.signedUrl ?? null;
  }

  const site = [
    estimate.site_address_line1,
    estimate.site_address_line2,
    estimate.city,
    estimate.postcode,
  ]
    .filter(Boolean)
    .join(', ');
  const vatNote = VAT_MODE_NOTE[estimate.vat_mode];
  const accepted = estimate.status === 'accepted';
  const expired =
    estimate.status === 'expired' ||
    (estimate.valid_until
      ? new Date(estimate.valid_until + 'T23:59:59').getTime() < Date.now()
      : false);

  return (
    <div className="min-h-screen bg-canvas py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Brand header */}
        <div className="mb-4 flex items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name ?? ''}
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-extrabold text-white"
              style={{ background: primary }}
            >
              {(tenant.name ?? 'BR').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="font-bold text-ink">{tenant.name}</div>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-card"
          style={{ borderTop: `4px solid ${primary}` }}
        >
          <div className="px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                Quotation · {estimate.number}
              </div>
              {accepted ? (
                <span className="rounded-full bg-[#E1F5EE] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0F6E56]">
                  Accepted
                </span>
              ) : expired ? (
                <span className="rounded-full bg-canvas px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Expired
                </span>
              ) : null}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {estimate.title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Prepared for {estimate.client_name}
              {site ? ` · ${site}` : ''}
            </p>
          </div>

          {/* Lines */}
          <div className="border-t border-hairline">
            {lines.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-4 border-b border-hairline px-6 py-3 sm:px-8"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">
                    {l.description}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {ESTIMATE_LINE_KIND_LABELS[l.kind]} · {Number(l.quantity)}{' '}
                    {l.unit}
                  </div>
                </div>
                <div className="text-sm font-bold text-ink">
                  {gbp(Number(l.line_price_pence))}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-5 sm:px-8">
            <div className="flex justify-between py-0.5 text-sm">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-semibold text-ink">
                {gbp(Number(estimate.subtotal_pence))}
              </span>
            </div>
            {estimate.vat_mode === 'standard' && (
              <div className="flex justify-between py-0.5 text-sm">
                <span className="text-ink-muted">VAT (20%)</span>
                <span className="font-semibold text-ink">
                  {gbp(Number(estimate.vat_pence))}
                </span>
              </div>
            )}
            <div
              className="mt-2 flex items-center justify-between border-t-2 pt-3"
              style={{ borderColor: primary }}
            >
              <span className="text-base font-extrabold text-ink">Total</span>
              <span className="text-2xl font-extrabold tracking-tight text-ink">
                {gbp(Number(estimate.total_pence))}
              </span>
            </div>
            {vatNote && (
              <p className="mt-3 text-[11px] italic text-ink-muted">{vatNote}</p>
            )}
            {estimate.notes && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink">
                {estimate.notes}
              </p>
            )}
            {estimate.valid_until && !accepted && (
              <p className="mt-3 text-xs text-ink-muted">
                This quote is valid until {formatDate(estimate.valid_until)}.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {pdfUrl && (
            <a
              href={pdfUrl}
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: primary }}
            >
              Download PDF
            </a>
          )}
          {tenant.business_email && (
            <a
              href={`mailto:${tenant.business_email}?subject=${encodeURIComponent(
                `Re: quote ${estimate.number}`,
              )}`}
              className="rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Reply to {tenant.name}
            </a>
          )}
        </div>

        {accepted ? (
          <div className="mt-4 rounded-2xl border border-[#B7E3D2] bg-[#E1F5EE] p-5 text-center">
            <div className="text-sm font-extrabold text-[#0F6E56]">
              Quote accepted
              {estimate.client_signature ? ` by ${estimate.client_signature}` : ''}
              {estimate.accepted_at ? ` · ${formatDate(estimate.accepted_at)}` : ''}
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Thanks — {tenant.name} has been notified and will be in touch to
              get started.
            </div>
          </div>
        ) : expired ? (
          <p className="mt-4 text-center text-xs text-ink-muted">
            This quote has expired. Please contact {tenant.name} for an updated
            quote.
          </p>
        ) : (
          <AcceptQuoteForm
            token={token}
            primary={primary}
            builderName={tenant.name ?? 'your builder'}
          />
        )}

        <p className="mt-8 text-center text-[11px] text-ink-muted">
          Powered by Builders Ready
        </p>
      </div>
    </div>
  );
}
