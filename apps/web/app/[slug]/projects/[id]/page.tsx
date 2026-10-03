import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantBySlug } from '@/lib/tenant-resolver';
import { createSupabaseServer } from '@/lib/supabase-server';
import {
  formatDate,
  relativeTime,
  computeMargin,
  summariseCosts,
} from '@br/shared';
import type { CostCategory } from '@br/shared';
import { ProjectStatusPill } from '@/components/status-pill';
import { HandoverCard } from '@/components/handover-card';
import { StageRow } from './stage-row';
import { UpdateComposer } from './update-composer';
import { DecisionsSection, type DecisionListRow } from './decisions-section';
import { VariationsSection, type VariationRow } from './variations-section';
import { InvoicesSection, type InvoiceRow } from './invoices-section';
import { ReportsSection, type ReportRow } from './reports-section';
import { DocumentsSection, type DocumentRow } from './documents-section';
import { ProjectActions } from './project-actions';
import { CashChart, CompletionRing } from '@/components/finance-visuals';
import { CostsSection, type CostRow, type MarginData } from './costs-section';
import {
  ContractSection,
  type ContractView,
  type MilestoneView,
} from './contract-section';
import { ClientReviewSection } from './client-review';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ProjectDetail({ params }: Props) {
  const { slug, id } = await params;
  const { tenant, role } = await requireTenantBySlug(slug);
  const canWrite = role === 'owner' || role === 'pm';
  const paymentsEnabled = !!tenant.connect_charges_enabled;

  const supabase = await createSupabaseServer();

  const [
    { data: project },
    { data: stages },
    { data: updates },
    { data: finance },
    { data: decisionRows },
    { data: variationRows },
    { data: invoiceRows },
    { data: reportRows },
    { data: documentRows },
    { data: contractRow },
    { data: milestoneRows },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `*,
         client:profiles!projects_client_id_fkey(id, full_name, email),
         pm:profiles!projects_pm_id_fkey(id, full_name, email)`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('project_stages')
      .select('*')
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('project_updates')
      .select(
        `id, headline, body, decision_needed, posted_at, stage_id,
         posted_by_profile:profiles!project_updates_posted_by_fkey(id, full_name),
         stage:project_stages!project_updates_stage_id_fkey(id, name)`,
      )
      .eq('project_id', id)
      .order('posted_at', { ascending: false })
      .limit(50),
    supabase
      .from('project_finance')
      .select('*')
      .eq('project_id', id)
      .maybeSingle(),
    supabase
      .from('decisions')
      .select(
        'id, title, description, status, deadline, decided_at, selected_option_id, raised_by, decided_by',
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('variations')
      .select(
        'id, number, title, description, delta_amount_gbp_pence, delta_days, status, decided_at, client_signature, proposed_by, created_at',
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select(
        'id, number, title, description, amount_gbp_pence, issued_at, due_at, status, paid_at, paid_reference, stripe_payment_intent_id',
      )
      .eq('project_id', id)
      .order('issued_at', { ascending: false }),
    supabase
      .from('reports')
      .select(
        'id, title, kind, summary, next_week, risks, decisions_needed, pdf_storage_path, posted_at, acknowledged_at, posted_by, acknowledged_by',
      )
      .eq('project_id', id)
      .order('posted_at', { ascending: false }),
    supabase
      .from('documents')
      .select('id, name, category, storage_path, size_bytes, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select(
        'id, contract_sum_pence, terms, retention_percent, status, signed_at, client_signature',
      )
      .eq('project_id', id)
      .maybeSingle(),
    supabase
      .from('payment_milestones')
      .select('id, name, percent, amount_pence, is_retention, invoice_id, position')
      .eq('project_id', id)
      .order('position'),
  ]);

  if (!project) notFound();

  // Trade → customer review: only once the job is completed, and only if not
  // already reviewed. Readable by any signed-in user (reviews_select).
  let hasClientReview = false;
  if (canWrite && project.status === 'completed') {
    const { data: existingReview } = await supabase
      .from('marketplace_reviews')
      .select('id')
      .eq('project_id', id)
      .eq('direction', 'trade_to_customer')
      .maybeSingle();
    hasClientReview = !!existingReview;
  }

  // Costs & margin — owner/PM only (RLS returns nothing to clients anyway).
  let marginData: MarginData | null = null;
  let costList: CostRow[] = [];
  if (canWrite) {
    const [{ data: costRows }, { data: estCost }] = await Promise.all([
      supabase
        .from('project_costs')
        .select(
          'id, category, description, supplier, incurred_on, amount_pence, receipt_storage_path',
        )
        .eq('project_id', id)
        .order('incurred_on', { ascending: false }),
      supabase
        .from('estimates')
        .select('cost_subtotal_pence')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    costList = (costRows ?? []).map((c) => ({
      id: c.id,
      category: c.category as CostCategory,
      description: c.description,
      supplier: c.supplier,
      incurred_on: c.incurred_on,
      amount_pence: Number(c.amount_pence),
      has_receipt: !!c.receipt_storage_path,
    }));
    const contractValue =
      Number(project.quoted_amount_pence ?? 0) +
      Number(finance?.variations_pence ?? 0);
    const summary = summariseCosts(costList);
    const budgeted =
      estCost && estCost.cost_subtotal_pence != null
        ? Number(estCost.cost_subtotal_pence)
        : null;
    const m = computeMargin(contractValue, summary.total_pence, budgeted);
    marginData = { ...m, by_category: summary.by_category };
  }

  // Resolve profile names for the new sections (raised_by, decided_by, etc.)
  const profileIds = new Set<string>();
  (decisionRows ?? []).forEach((d) => {
    if (d.raised_by) profileIds.add(d.raised_by);
    if (d.decided_by) profileIds.add(d.decided_by);
  });
  (variationRows ?? []).forEach((v) => {
    if (v.proposed_by) profileIds.add(v.proposed_by);
  });
  (reportRows ?? []).forEach((r) => {
    if (r.posted_by) profileIds.add(r.posted_by);
    if (r.acknowledged_by) profileIds.add(r.acknowledged_by);
  });
  const { data: extraProfiles } = profileIds.size
    ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(profileIds))
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (uid: string | null | undefined) =>
    (uid && extraProfiles?.find((p) => p.id === uid)?.full_name) || 'Someone';

  // Fetch options for this project's decisions in one round-trip.
  interface OptionRow {
    id: string;
    decision_id: string;
    label: string;
    description: string | null;
    price_gbp_pence: number | null;
    position: number;
  }
  const decisionIds = (decisionRows ?? []).map((d) => d.id);
  const { data: decisionOptions } = decisionIds.length
    ? await supabase
        .from('decision_options')
        .select('id, decision_id, label, description, price_gbp_pence, position')
        .in('decision_id', decisionIds)
        .order('position')
    : { data: [] as OptionRow[] };
  const optionsByDecision = new Map<string, OptionRow[]>();
  for (const o of (decisionOptions ?? []) as OptionRow[]) {
    const list = optionsByDecision.get(o.decision_id) ?? [];
    list.push(o);
    optionsByDecision.set(o.decision_id, list);
  }

  const decisions: DecisionListRow[] = (decisionRows ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    status: d.status,
    deadline: d.deadline,
    decided_at: d.decided_at,
    raised_by_name: nameOf(d.raised_by),
    decided_by_name: d.decided_by ? nameOf(d.decided_by) : null,
    selected_option_id: d.selected_option_id,
    options: (optionsByDecision.get(d.id) ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      price_gbp_pence: o.price_gbp_pence,
    })),
  }));

  const variations: VariationRow[] = (variationRows ?? []).map((v) => ({
    id: v.id,
    number: v.number,
    title: v.title,
    description: v.description,
    delta_amount_gbp_pence: Number(v.delta_amount_gbp_pence),
    delta_days: v.delta_days,
    status: v.status,
    decided_at: v.decided_at,
    client_signature: v.client_signature,
    proposed_by_name: nameOf(v.proposed_by),
  }));

  const invoices: InvoiceRow[] = (invoiceRows ?? []) as InvoiceRow[];
  const reports: ReportRow[] = (reportRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    summary: r.summary,
    next_week: r.next_week,
    risks: r.risks,
    decisions_needed: r.decisions_needed,
    pdf_storage_path: r.pdf_storage_path,
    posted_at: r.posted_at,
    acknowledged_at: r.acknowledged_at,
    posted_by_name: nameOf(r.posted_by),
    acknowledged_by_name: r.acknowledged_by ? nameOf(r.acknowledged_by) : null,
  }));

  // Suggest next numbers for variation / invoice forms.
  const nextVariationNumber =
    'V' +
    String(
      (variations.filter((v) => /^V\d+$/.test(v.number)).length || 0) + 1,
    ).padStart(3, '0');
  const nextInvoiceNumber =
    'INV-' +
    String(
      (invoices.filter((i) => /^INV-\d+$/.test(i.number)).length || 0) + 1,
    ).padStart(3, '0');

  // Contract & payment schedule (visible to everyone with project access).
  const contract: ContractView | null = contractRow
    ? {
        id: contractRow.id,
        contract_sum_pence: Number(contractRow.contract_sum_pence),
        terms: contractRow.terms,
        retention_percent: Number(contractRow.retention_percent),
        status: contractRow.status as ContractView['status'],
        signed_at: contractRow.signed_at,
        client_signature: contractRow.client_signature,
      }
    : null;
  const invoiceStatusById = new Map<string, string>(
    invoices.map((i) => [i.id, i.status]),
  );
  const milestones: MilestoneView[] = (milestoneRows ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    percent: m.percent != null ? Number(m.percent) : null,
    amount_pence: m.amount_pence != null ? Number(m.amount_pence) : null,
    is_retention: m.is_retention,
    invoice_id: m.invoice_id,
    invoice_status: m.invoice_id ? invoiceStatusById.get(m.invoice_id) ?? 'sent' : null,
  }));
  const defaultContractSum =
    Number(project.quoted_amount_pence ?? 0) +
    Number(finance?.variations_pence ?? 0);
  const canSignContract = role === 'client' && contract?.status === 'sent';

  const client = Array.isArray(project.client) ? project.client[0] : project.client;
  const pm = Array.isArray(project.pm) ? project.pm[0] : project.pm;

  return (
    <div>
      <Link
        href={`/${slug}/projects`}
        className="mb-3 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← All projects
      </Link>

      {/* HEADER */}
      <section className="rounded-card border border-hairline bg-white p-6 shadow-card">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{project.name}</h1>
              <ProjectStatusPill status={project.status} />
            </div>
            <p className="text-sm text-ink-muted">
              {project.address_line1}
              {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city} ·{' '}
              {project.postcode}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Client: <span className="font-semibold text-ink">{client?.full_name ?? '—'}</span>
              {'  ·  '}
              PM: <span className="font-semibold text-ink">{pm?.full_name ?? '—'}</span>
              {canWrite && (
                <Link
                  href={`/${slug}/team`}
                  className="ml-2 text-[10px] font-semibold text-primary hover:underline"
                >
                  Reassign in Team →
                </Link>
              )}
            </p>
          </div>
          <div className="min-w-[180px] text-right">
            <div className="text-3xl font-extrabold tracking-tight">
              {project.progress_percent}%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              Progress
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${project.progress_percent}%`,
              background: 'linear-gradient(90deg, var(--br-primary), var(--br-accent))',
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
          <DateLabel label="Started" value={formatDate(project.start_date)} />
          <DateLabel
            label={project.actual_end_date ? 'Completed' : 'Due'}
            value={formatDate(project.actual_end_date ?? project.estimated_end_date)}
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-muted">
              Open decisions
            </div>
            <div className="text-sm font-bold">{finance?.open_decisions ?? 0}</div>
          </div>
        </div>
      </section>

      {/* FINANCE */}
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <CashChart
            contracted={
              Number(project.quoted_amount_pence ?? 0) +
              Number(finance?.variations_pence ?? 0)
            }
            invoiced={Number(finance?.invoiced_pence ?? 0)}
            paid={Number(finance?.paid_pence ?? 0)}
            outstanding={
              Number(finance?.invoiced_pence ?? 0) - Number(finance?.paid_pence ?? 0)
            }
          />
        </div>
        <CompletionRing
          paid={Number(finance?.paid_pence ?? 0)}
          contracted={
            Number(project.quoted_amount_pence ?? 0) +
            Number(finance?.variations_pence ?? 0)
          }
        />
      </section>

      {/* TIMELINE */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="flex items-center px-5 py-3">
          <h2 className="text-sm font-bold">Timeline</h2>
          <span className="ml-2 text-xs text-ink-muted">
            {stages?.length ?? 0} stages
          </span>
        </header>
        <ol>
          {stages?.map((s, idx) => (
            <StageRow
              key={s.id}
              stage={s}
              isLast={idx === (stages?.length ?? 0) - 1}
              canWrite={canWrite}
            />
          ))}
        </ol>
      </section>

      {/* UPDATES */}
      <section className="mt-6 rounded-card border border-hairline bg-white shadow-card">
        <header className="flex items-center px-5 py-3">
          <h2 className="text-sm font-bold">Updates</h2>
          <span className="ml-2 text-xs text-ink-muted">
            {updates?.length ?? 0} total
          </span>
        </header>
        {canWrite && (
          <div className="border-t border-hairline px-5 py-4">
            <UpdateComposer
              projectId={project.id}
              stages={stages ?? []}
            />
          </div>
        )}
        <ul className="border-t border-hairline">
          {(updates ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-xs text-ink-muted">
              No updates yet. {canWrite ? 'Post the first one above.' : 'Check back soon.'}
            </li>
          ) : (
            updates!.map((u) => {
              const poster = Array.isArray(u.posted_by_profile)
                ? u.posted_by_profile[0]
                : u.posted_by_profile;
              const stage = Array.isArray(u.stage) ? u.stage[0] : u.stage;
              return (
                <li key={u.id} className="border-b border-hairline px-5 py-4 last:border-b-0">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink">
                      {poster?.full_name ?? 'Unknown'}
                    </span>
                    <span>·</span>
                    <span>{relativeTime(u.posted_at)}</span>
                    {stage && (
                      <>
                        <span>·</span>
                        <span>{stage.name}</span>
                      </>
                    )}
                  </div>
                  {u.headline && (
                    <div className="text-sm font-bold text-ink">{u.headline}</div>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {u.body}
                  </p>
                  {u.decision_needed && (
                    <div className="mt-3 rounded-lg border-l-4 border-accent bg-accent/5 px-3 py-2 text-xs">
                      <div className="font-bold uppercase tracking-wider text-accent-deep">
                        Decision needed
                      </div>
                      <div className="mt-1 text-ink">{u.decision_needed}</div>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* DECISIONS */}
      <DecisionsSection
        projectId={project.id}
        decisions={decisions}
        canWrite={canWrite}
      />

      {/* VARIATIONS */}
      <VariationsSection
        projectId={project.id}
        variations={variations}
        canWrite={canWrite}
        suggestedNextNumber={nextVariationNumber}
      />

      {/* INVOICES */}
      <InvoicesSection
        projectId={project.id}
        invoices={invoices}
        canWrite={canWrite}
        suggestedNextNumber={nextInvoiceNumber}
        paymentsEnabled={paymentsEnabled}
      />

      {/* CONTRACT & PAYMENT SCHEDULE — visible to all with access */}
      <ContractSection
        projectId={project.id}
        contract={contract}
        milestones={milestones}
        defaultContractSum={defaultContractSum}
        canWrite={canWrite}
        canSign={!!canSignContract}
      />

      {/* COSTS & MARGIN — owner/PM only */}
      {canWrite && marginData && (
        <CostsSection
          projectId={project.id}
          costs={costList}
          margin={marginData}
          canWrite={canWrite}
        />
      )}

      {/* REPORTS */}
      <ReportsSection
        projectId={project.id}
        reports={reports}
        canWrite={canWrite}
      />

      {/* DOCUMENTS */}
      <DocumentsSection
        projectId={project.id}
        documents={(documentRows ?? []) as DocumentRow[]}
        canManage={canWrite}
      />

      <HandoverCard
        projectId={project.id}
        hasPdf={!!project.handover_pdf_storage_path}
        canGenerate={canWrite}
      />

      <p className="mt-6 text-center text-[10px] text-ink-muted">
        The handover PDF includes everything above plus variations and invoices.
        Regenerate it any time before final handover.
      </p>

      {canWrite && project.status === 'completed' && client && (
        <ClientReviewSection
          projectId={project.id}
          clientId={client.id}
          clientName={client.full_name ?? 'the client'}
          alreadyReviewed={hasClientReview}
        />
      )}

      {canWrite && (
        <ProjectActions
          projectId={project.id}
          slug={slug}
          projectName={project.name}
          isOwner={role === 'owner'}
          canArchive={canWrite}
        />
      )}
    </div>
  );
}

function DateLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

