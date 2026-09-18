import Link from 'next/link';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { gbp, formatDate } from '@br/shared';
import type { EstimateStatus } from '@br/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

const STATUS_STYLES: Record<EstimateStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-canvas text-ink-muted' },
  sent: { label: 'Sent', cls: 'bg-[#E6F0FA] text-[#2563A8]' },
  accepted: { label: 'Accepted', cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
  declined: { label: 'Declined', cls: 'bg-[#FAECE7] text-[#B23B1D]' },
  expired: { label: 'Expired', cls: 'bg-canvas text-ink-muted' },
};

export default async function EstimatesListPage({ params }: Props) {
  const { slug } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const supabase = await createSupabaseServer();

  const { data: estimates } = await supabase
    .from('estimates')
    .select(
      'id, number, title, client_name, status, total_pence, valid_until, created_at',
    )
    .order('created_at', { ascending: false });

  const canCreate = role === 'owner' || role === 'pm';

  const all = estimates ?? [];
  const sumTotals = (arr: typeof all) =>
    arr.reduce((acc, e) => acc + Number(e.total_pence), 0);
  const drafts = all.filter((e) => e.status === 'draft');
  const sent = all.filter((e) => e.status === 'sent');
  const accepted = all.filter((e) => e.status === 'accepted');
  const decided = all.filter((e) =>
    ['accepted', 'declined', 'expired'].includes(e.status as string),
  );
  const winRate = decided.length
    ? Math.round((accepted.length / decided.length) * 100)
    : null;

  return (
    <div>
      <header className="mb-6 flex items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Tenant · {tenant.name}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Quotes &amp; estimates</h1>
        </div>
        {canCreate && (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/${slug}/estimates/rates`}
              className="rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
            >
              Saved rates
            </Link>
            <Link
              href={`/${slug}/estimates/new`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              + New quote
            </Link>
          </div>
        )}
      </header>

      {all.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Open (sent)"
            value={gbp(sumTotals(sent))}
            sub={`${sent.length} quote${sent.length === 1 ? '' : 's'} out`}
          />
          <Kpi
            label="Accepted"
            value={gbp(sumTotals(accepted))}
            sub={`${accepted.length} won`}
          />
          <Kpi
            label="Win rate"
            value={winRate === null ? '—' : `${winRate}%`}
            sub="of decided quotes"
          />
          <Kpi
            label="Drafts"
            value={String(drafts.length)}
            sub={gbp(sumTotals(drafts))}
          />
        </div>
      )}

      {!estimates || estimates.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline bg-white p-14 text-center">
          <h2 className="text-lg font-extrabold tracking-tight">
            No quotes yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Build a quote from your costs and margin. Win it and it becomes a
            project — you can also quote on site from the mobile app.
          </p>
          {canCreate && (
            <Link
              href={`/${slug}/estimates/new`}
              className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create your first quote
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
          {estimates.map((e, i) => {
            const s = STATUS_STYLES[e.status as EstimateStatus] ?? STATUS_STYLES.draft;
            return (
              <Link
                key={e.id}
                href={`/${slug}/estimates/${e.id}`}
                className={`block ${i > 0 ? 'border-t border-hairline' : ''} p-5 transition hover:bg-canvas`}
              >
                <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr] items-center gap-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {e.number}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">{e.title}</div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      {e.client_name}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.cls}`}
                    >
                      {s.label}
                    </span>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {e.valid_until
                        ? `Valid to ${formatDate(e.valid_until)}`
                        : formatDate(e.created_at)}
                    </div>
                  </div>
                  <div className="text-right text-base font-extrabold text-ink">
                    {gbp(Number(e.total_pence))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-ink">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{sub}</div>
    </div>
  );
}
