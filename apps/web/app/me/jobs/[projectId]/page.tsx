import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gbp, formatDate, relativeTime, offerableInvoiceMethods } from '@br/shared';
import { requireCustomer, isInvitedClient } from '@/lib/customer-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DecisionAccept, VariationSign, PayButton } from './portal-actions';

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ pay?: string }>;
}

const STAGE_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  delayed: 'Delayed',
};
const STAGE_STYLE: Record<string, string> = {
  not_started: 'bg-ink/10 text-ink-muted',
  in_progress: 'bg-primary/10 text-primary',
  complete: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-amber-100 text-amber-700',
};

export default async function CustomerProjectPortal({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { pay } = await searchParams;
  const me = await requireCustomer();
  const supabase = await createSupabaseServer();

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, progress_percent, estimated_end_date, tenant_id, client_id, handover_pdf_storage_path')
    .eq('id', projectId)
    .maybeSingle();
  if (!project || project.client_id !== me.user_id) notFound();

  let handoverUrl: string | null = null;
  if (project.handover_pdf_storage_path) {
    const { data: signed } = await supabase.storage
      .from('handovers')
      .createSignedUrl(project.handover_pdf_storage_path, 3600);
    handoverUrl = signed?.signedUrl ?? null;
  }

  const [stagesRes, updatesRes, invoicesRes, decisionsRes, variationsRes] =
    await Promise.all([
      supabase
        .from('project_stages')
        .select('id, position, name, status, target_end_date')
        .eq('project_id', projectId)
        .order('position', { ascending: true }),
      supabase
        .from('project_updates')
        .select('id, headline, body, posted_at')
        .eq('project_id', projectId)
        .order('posted_at', { ascending: false })
        .limit(8),
      supabase
        .from('invoices')
        .select('id, number, title, amount_gbp_pence, status, due_at, cash_requested_at, bank_requested_at, allow_card, allow_bank_transfer, allow_cash')
        .eq('project_id', projectId)
        .order('issued_at', { ascending: false }),
      supabase
        .from('decisions')
        .select('id, title, description, deadline')
        .eq('project_id', projectId)
        .eq('status', 'open'),
      supabase
        .from('variations')
        .select('id, number, title, description, delta_amount_gbp_pence, delta_days')
        .eq('project_id', projectId)
        .eq('status', 'proposed'),
    ]).then((r) => r);

  const stages = stagesRes.data ?? [];
  const updates = updatesRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const decisions = decisionsRes.data ?? [];
  const variations = variationsRes.data ?? [];

  const optionsByDecision = new Map<string, { id: string; label: string; description: string | null; price_gbp_pence: number | null }[]>();
  if (decisions.length) {
    const { data: opts } = await supabase
      .from('decision_options')
      .select('id, decision_id, label, description, price_gbp_pence, position')
      .in('decision_id', decisions.map((d) => d.id))
      .order('position', { ascending: true });
    (opts ?? []).forEach((o) => {
      const arr = optionsByDecision.get(o.decision_id) ?? [];
      arr.push({ id: o.id, label: o.label, description: o.description, price_gbp_pence: o.price_gbp_pence });
      optionsByDecision.set(o.decision_id, arr);
    });
  }

  const { data: trade } = await supabase
    .from('trades_public')
    .select('name')
    .eq('id', project.tenant_id)
    .maybeSingle();

  // Builder payment readiness + bank details. Read via admin: the client has
  // already passed the client_id gate above, so is entitled to see how to pay
  // their builder, but the tenants row isn't directly readable by a customer.
  const { data: builder } = await getSupabaseAdmin()
    .from('tenants')
    .select(
      'connect_charges_enabled, bank_name, bank_account_name, bank_sort_code, bank_account_number',
    )
    .eq('id', project.tenant_id)
    .maybeSingle();
  const cardReady = !!builder?.connect_charges_enabled;
  const bankReady = !!(builder?.bank_account_number && builder?.bank_sort_code);
  const bankDetails = bankReady
    ? {
        name: builder?.bank_name ?? null,
        accountName: builder?.bank_account_name ?? null,
        sortCode: builder?.bank_sort_code ?? null,
        accountNumber: builder?.bank_account_number ?? null,
      }
    : null;
  const methodsFor = (inv: {
    allow_card: boolean;
    allow_bank_transfer: boolean;
    allow_cash: boolean;
  }) => offerableInvoiceMethods(inv, { cardReady, bankReady });

  const unpaid = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');

  // Back link: for an invited client with a single project, "/me" just
  // redirects straight back here — so hide the link rather than show a dead
  // one. Marketplace customers (and multi-project clients) keep it.
  const invitedClient = await isInvitedClient();
  const { count: myProjectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', me.user_id)
    .neq('status', 'archived');
  const showBack = !(invitedClient && (myProjectCount ?? 0) <= 1);
  const backLabel = invitedClient ? 'Your projects' : 'Your jobs';

  return (
    <div className="w-full">
      {showBack && (
        <Link href="/me" className="text-sm font-bold text-primary hover:underline">
          ‹ {backLabel}
        </Link>
      )}

      {pay === 'success' && (
        <div className={`${showBack ? 'mt-3 ' : ''}rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800`}>
          Payment received — thank you.
        </div>
      )}

      <h1 className={`${showBack || pay === 'success' ? 'mt-3 ' : ''}text-2xl font-extrabold tracking-tight text-ink`}>
        {project.name}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {trade?.name ?? 'Your trade'} · est. completion {formatDate(project.estimated_end_date)}
      </p>

      <div className="mt-4 rounded-card border border-hairline bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Progress</span>
          <span className="text-sm font-extrabold text-primary">{project.progress_percent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full rounded-full bg-canvas">
          <div
            className="h-2.5 rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, project.progress_percent))}%` }}
          />
        </div>
      </div>

      {/* Needs you */}
      {(decisions.length > 0 || variations.length > 0 || unpaid.length > 0) && (
        <Section title="Needs you">
          {decisions.map((d) => (
            <Card key={d.id}>
              <div className="text-sm font-extrabold text-ink">Decision: {d.title}</div>
              {d.description && <p className="mt-1 text-sm text-ink-muted">{d.description}</p>}
              {d.deadline && (
                <p className="mt-1 text-xs text-amber-700">By {formatDate(d.deadline)}</p>
              )}
              <DecisionAccept
                decisionId={d.id}
                options={(optionsByDecision.get(d.id) ?? []).map((o) => ({
                  id: o.id,
                  label: o.price_gbp_pence ? `${o.label} — ${gbp(o.price_gbp_pence)}` : o.label,
                }))}
              />
            </Card>
          ))}
          {variations.map((v) => (
            <Card key={v.id}>
              <div className="text-sm font-extrabold text-ink">
                Variation {v.number}: {v.title}
              </div>
              {v.description && <p className="mt-1 text-sm text-ink-muted">{v.description}</p>}
              <p className="mt-1 text-sm font-bold text-ink">
                {v.delta_amount_gbp_pence >= 0 ? '+' : ''}
                {gbp(v.delta_amount_gbp_pence)} · {v.delta_days >= 0 ? '+' : ''}
                {v.delta_days} days
              </p>
              <VariationSign variationId={v.id} />
            </Card>
          ))}
          {unpaid.map((i) => (
            <Card key={i.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-ink">
                    {i.number} — {i.title}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {gbp(i.amount_gbp_pence)} · due {formatDate(i.due_at)}
                    {i.status === 'overdue' ? ' · overdue' : ''}
                  </div>
                </div>
                <PayButton
                  invoiceId={i.id}
                  methods={methodsFor(i)}
                  bankDetails={bankDetails}
                  cashRequested={!!i.cash_requested_at}
                  bankRequested={!!i.bank_requested_at}
                />
              </div>
            </Card>
          ))}
        </Section>
      )}

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
      {/* Timeline */}
      <Section title="Timeline" flush>
        {stages.length === 0 ? (
          <p className="text-sm text-ink-muted">The timeline will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {stages.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-card border border-hairline bg-white px-4 py-3"
              >
                <span className="text-sm font-semibold text-ink">{s.name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STAGE_STYLE[s.status] ?? ''}`}
                >
                  {STAGE_LABEL[s.status] ?? s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Updates */}
      <Section title="Updates" flush>
        {updates.length === 0 ? (
          <p className="text-sm text-ink-muted">No updates yet.</p>
        ) : (
          <ul className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="rounded-card border border-hairline bg-white p-4">
                {u.headline && <div className="text-sm font-extrabold text-ink">{u.headline}</div>}
                <p className="mt-1 text-sm text-ink">{u.body}</p>
                <p className="mt-1 text-xs text-ink-muted">{relativeTime(u.posted_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Handover */}
      {handoverUrl && (
        <Section title="Project handover" flush>
          <a
            href={handoverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Download handover PDF
          </a>
        </Section>
      )}

      {/* All invoices */}
      {invoices.length > 0 && (
        <Section title="Payments" flush>
          <ul className="space-y-2">
            {invoices.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-card border border-hairline bg-white px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {i.number} — {i.title}
                  </div>
                  <div className="text-xs text-ink-muted">{gbp(i.amount_gbp_pence)}</div>
                </div>
                {i.status === 'paid' ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    Paid
                  </span>
                ) : i.status === 'sent' || i.status === 'overdue' ? (
                  <PayButton
                    invoiceId={i.id}
                    methods={methodsFor(i)}
                    bankDetails={bankDetails}
                    cashRequested={!!i.cash_requested_at}
                    bankRequested={!!i.bank_requested_at}
                  />
                ) : (
                  <span className="text-xs font-semibold text-ink-muted">{i.status}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  flush,
}: {
  title: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={flush ? '' : 'mt-7'}>
      <h2 className="mb-3 text-lg font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 rounded-card border border-hairline bg-white p-5">{children}</div>;
}
