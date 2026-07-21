import 'server-only';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type {
  Project,
  Profile,
  ProjectStage,
  Variation,
  Invoice,
  Tenant,
  ProjectUpdate,
} from '@br/shared';
import { gbp, formatDate } from '@br/shared';

/**
 * Builders Ready — Project Handover PDF
 *
 * A single document the builder hands over at the end of a project. Both
 * the builder and the client can download it from the dashboard for life.
 *
 * v1 scope: text-only. Embedding update photos requires fetching every
 * signed URL server-side and downloading the bytes into the PDF — doable
 * but adds 10-30 seconds per project. Defer to polish.
 */

const PRIMARY = '#0F4C5C';
const ACCENT = '#E07A5F';
const INK = '#0B1418';
const MUTED = '#5F7480';
const HAIRLINE = '#E1E6E9';
const CANVAS = '#F4F6F7';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    lineHeight: 1.45,
  },
  // Header band
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    marginBottom: 20,
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: INK,
  },
  brandPrimary: { color: PRIMARY },
  reportTitle: { fontSize: 8, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  // Project title block
  projectTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: INK,
    marginBottom: 4,
  },
  projectAddress: { fontSize: 10, color: MUTED },
  // Big card grid
  summaryGrid: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 18,
    gap: 8,
  },
  summaryCell: {
    flex: 1,
    padding: 10,
    backgroundColor: CANVAS,
    borderRadius: 6,
  },
  cellLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 3,
  },
  cellValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: INK },
  cellMeta: { fontSize: 8, color: MUTED, marginTop: 2 },
  // Section header
  section: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: INK,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  // Stage row
  stageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  stagePos: {
    width: 18,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: MUTED,
  },
  stageBody: { flex: 1 },
  stageName: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: INK },
  stageMeta: { fontSize: 8, color: MUTED, marginTop: 1 },
  stagePill: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: '#E5EEEF',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Two-col entry
  entry: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  entryLeft: { width: 100, fontSize: 9, color: MUTED, paddingRight: 8 },
  entryRight: { flex: 1, fontSize: 9, color: INK },
  entryRightStrong: { fontFamily: 'Helvetica-Bold' },
  // Update item
  updateItem: {
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  updateHead: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: INK },
  updateMeta: { fontSize: 8, color: MUTED, marginTop: 1 },
  updateBody: { fontSize: 9, color: INK, marginTop: 4, lineHeight: 1.5 },
  // Decision item
  decisionItem: {
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
    paddingTop: 6,
  },
  // Cover page
  coverPage: { fontFamily: 'Helvetica', color: INK },
  coverBand: {
    backgroundColor: PRIMARY,
    paddingTop: 92,
    paddingBottom: 40,
    paddingHorizontal: 44,
  },
  coverBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  coverKicker: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#9FE1CB',
    marginTop: 10,
  },
  coverBody: { paddingHorizontal: 44, paddingTop: 48 },
  coverProject: { fontFamily: 'Helvetica-Bold', fontSize: 30, color: INK },
  coverAddress: { fontSize: 12, color: MUTED, marginTop: 8 },
  coverMetaRow: { flexDirection: 'row', marginTop: 48, gap: 16 },
  coverMetaLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 4,
  },
  coverMetaValue: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: INK },
  coverFooter: { position: 'absolute', bottom: 40, left: 44, fontSize: 8, color: MUTED },
  paidBarTrack: {
    height: 4,
    backgroundColor: '#C0DD97',
    borderRadius: 2,
    marginTop: 5,
  },
  paidBarFill: { height: 4, backgroundColor: '#3B6D11', borderRadius: 2 },
});

interface HandoverData {
  tenant: Pick<
    Tenant,
    'name' | 'business_email' | 'company_number' | 'vat_number' | 'bank_name' | 'bank_account_name' | 'bank_sort_code' | 'bank_account_number'
  >;
  project: Pick<
    Project,
    | 'name'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'postcode'
    | 'start_date'
    | 'estimated_end_date'
    | 'actual_end_date'
    | 'completed_at'
    | 'quoted_amount_pence'
    | 'progress_percent'
    | 'status'
  > & {
    client: Pick<Profile, 'full_name' | 'email'>;
    pm: Pick<Profile, 'full_name' | 'email'>;
  };
  stages: ProjectStage[];
  updates: (Pick<
    ProjectUpdate,
    'headline' | 'body' | 'posted_at' | 'decision_needed'
  > & { posted_by_name: string; stage_name: string })[];
  decisions: {
    title: string;
    description: string | null;
    status: string;
    decided_at: string | null;
    decided_by_name: string | null;
    chosen_label: string | null;
    chosen_price_pence: number | null;
  }[];
  variations: (Pick<
    Variation,
    | 'number'
    | 'title'
    | 'description'
    | 'delta_amount_gbp_pence'
    | 'delta_days'
    | 'status'
    | 'decided_at'
    | 'client_signature'
  > & { proposed_by_name: string })[];
  invoices: (Pick<
    Invoice,
    | 'number'
    | 'title'
    | 'amount_gbp_pence'
    | 'issued_at'
    | 'due_at'
    | 'status'
    | 'paid_at'
    | 'paid_reference'
  >)[];
}

function HandoverDocument({ data }: { data: HandoverData }) {
  const { tenant, project, stages, updates, decisions, variations, invoices } = data;
  const quote = project.quoted_amount_pence ?? 0;
  const variationsTotal = variations
    .filter((v) => v.status === 'accepted')
    .reduce((s, v) => s + v.delta_amount_gbp_pence, 0);
  const invoicedTotal = invoices
    .filter((i) => ['sent', 'paid', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.amount_gbp_pence, 0);
  const paidTotal = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.amount_gbp_pence, 0);
  const finalValue = quote + variationsTotal;
  const today = formatDate(new Date().toISOString());

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverBand}>
          <Text style={styles.coverBrand}>
            BUILDERS <Text style={{ color: '#9FE1CB' }}>READY</Text>
          </Text>
          <Text style={styles.coverKicker}>Project handover document</Text>
        </View>
        <View style={styles.coverBody}>
          <Text style={styles.coverProject}>{project.name}</Text>
          <Text style={styles.coverAddress}>
            {project.address_line1}
            {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city}{' '}
            {project.postcode}
          </Text>
          <View style={styles.coverMetaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverMetaLabel}>Prepared for</Text>
              <Text style={styles.coverMetaValue}>{project.client.full_name}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverMetaLabel}>Final value</Text>
              <Text style={styles.coverMetaValue}>
                {finalValue > 0 ? gbp(finalValue, { whole: true }) : '—'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coverMetaLabel}>Prepared by</Text>
              <Text style={styles.coverMetaValue}>{tenant.name}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.coverFooter}>Generated {today} · buildersready.uk</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>
              BUILDERS <Text style={styles.brandPrimary}>READY</Text>
            </Text>
            <Text style={styles.reportTitle}>Project Handover Document</Text>
          </View>
          <View>
            <Text style={[styles.reportTitle, { textAlign: 'right' }]}>
              Generated {today}
            </Text>
            <Text style={[styles.reportTitle, { textAlign: 'right' }]}>
              {tenant.name}
            </Text>
          </View>
        </View>

        {/* Project title */}
        <Text style={styles.projectTitle}>{project.name}</Text>
        <Text style={styles.projectAddress}>
          {project.address_line1}
          {project.address_line2 ? `, ${project.address_line2}` : ''}, {project.city}{' '}
          {project.postcode}
        </Text>

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCell, { backgroundColor: '#E1F5EE' }]}>
            <Text style={styles.cellLabel}>Original quote</Text>
            <Text style={[styles.cellValue, { color: '#04342C' }]}>
              {quote > 0 ? gbp(quote, { whole: true }) : '—'}
            </Text>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: '#FAEEDA' }]}>
            <Text style={styles.cellLabel}>Variations</Text>
            <Text style={[styles.cellValue, { color: '#412402' }]}>
              {variationsTotal === 0 ? '£0' : gbp(variationsTotal, { whole: true })}
            </Text>
            <Text style={styles.cellMeta}>
              {variations.filter((v) => v.status === 'accepted').length} signed
            </Text>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: PRIMARY }]}>
            <Text style={[styles.cellLabel, { color: '#9FE1CB' }]}>Final value</Text>
            <Text style={[styles.cellValue, { color: '#FFFFFF' }]}>
              {finalValue > 0 ? gbp(finalValue, { whole: true }) : '—'}
            </Text>
          </View>
          <View style={[styles.summaryCell, { backgroundColor: '#EAF3DE' }]}>
            <Text style={styles.cellLabel}>Paid</Text>
            <Text style={[styles.cellValue, { color: '#173404' }]}>
              {paidTotal === 0 ? '£0' : gbp(paidTotal, { whole: true })}
            </Text>
            <Text style={styles.cellMeta}>
              of {invoicedTotal === 0 ? '£0' : gbp(invoicedTotal, { whole: true })} invoiced
            </Text>
            <View style={styles.paidBarTrack}>
              <View
                style={[
                  styles.paidBarFill,
                  {
                    width: `${
                      invoicedTotal > 0 ? Math.round((paidTotal / invoicedTotal) * 100) : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Project details */}
        <Text style={styles.section}>Project details</Text>
        <View style={styles.entry}>
          <Text style={styles.entryLeft}>Builder</Text>
          <Text style={styles.entryRight}>
            <Text style={styles.entryRightStrong}>{tenant.name}</Text>
            {tenant.company_number ? `  ·  Companies House ${tenant.company_number}` : ''}
            {tenant.vat_number ? `  ·  VAT ${tenant.vat_number}` : ''}
          </Text>
        </View>
        <View style={styles.entry}>
          <Text style={styles.entryLeft}>Client</Text>
          <Text style={styles.entryRight}>
            <Text style={styles.entryRightStrong}>{project.client.full_name}</Text>
            {'  ·  '}
            {project.client.email}
          </Text>
        </View>
        <View style={styles.entry}>
          <Text style={styles.entryLeft}>Project Manager</Text>
          <Text style={styles.entryRight}>
            <Text style={styles.entryRightStrong}>{project.pm.full_name}</Text>
            {'  ·  '}
            {project.pm.email}
          </Text>
        </View>
        <View style={styles.entry}>
          <Text style={styles.entryLeft}>Started</Text>
          <Text style={styles.entryRight}>{formatDate(project.start_date)}</Text>
        </View>
        <View style={styles.entry}>
          <Text style={styles.entryLeft}>
            {project.actual_end_date ? 'Completed' : 'Due'}
          </Text>
          <Text style={styles.entryRight}>
            {formatDate(project.actual_end_date ?? project.estimated_end_date)}
            {project.completed_at && `  ·  handover ${formatDate(project.completed_at)}`}
          </Text>
        </View>

        {/* Timeline */}
        <Text style={styles.section}>Timeline</Text>
        {stages.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 9 }}>No stages recorded.</Text>
        )}
        {stages.map((s) => (
          <View key={s.id} style={styles.stageRow}>
            <Text style={styles.stagePos}>{s.position}.</Text>
            <View style={styles.stageBody}>
              <Text style={styles.stageName}>{s.name}</Text>
              <Text style={styles.stageMeta}>
                {formatDate(s.start_date, { short: true })} →{' '}
                {formatDate(s.actual_end_date ?? s.target_end_date, { short: true })}
                {s.actual_end_date && '  · actual'}
              </Text>
              {s.pm_commentary && (
                <Text style={[styles.stageMeta, { marginTop: 3, color: INK }]}>
                  {s.pm_commentary}
                </Text>
              )}
            </View>
            <Text style={styles.stagePill}>{s.status.replace('_', ' ')}</Text>
          </View>
        ))}

        {/* Variations */}
        <Text style={styles.section}>Variations</Text>
        {variations.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 9 }}>No variations on this project.</Text>
        )}
        {variations.map((v) => (
          <View key={v.number} style={styles.decisionItem}>
            <Text style={styles.updateHead}>
              {v.number} · {v.title}
            </Text>
            <Text style={styles.updateMeta}>
              {v.status === 'accepted'
                ? `Signed by ${v.client_signature ?? '—'} on ${
                    v.decided_at ? formatDate(v.decided_at) : '—'
                  }`
                : `Status: ${v.status}`}
              {'  ·  '}
              {v.delta_amount_gbp_pence > 0 ? '+' : ''}
              {gbp(v.delta_amount_gbp_pence)}
              {v.delta_days !== 0 &&
                `  ·  ${v.delta_days > 0 ? '+' : ''}${v.delta_days} day${
                  Math.abs(v.delta_days) === 1 ? '' : 's'
                }`}
            </Text>
            {v.description && <Text style={styles.updateBody}>{v.description}</Text>}
          </View>
        ))}

        {/* Decisions */}
        <Text style={styles.section}>Decisions</Text>
        {decisions.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 9 }}>No decisions raised.</Text>
        )}
        {decisions.map((d, i) => (
          <View key={i} style={styles.decisionItem}>
            <Text style={styles.updateHead}>{d.title}</Text>
            <Text style={styles.updateMeta}>
              {d.status === 'accepted'
                ? `Accepted by ${d.decided_by_name ?? 'client'}${
                    d.decided_at ? ` on ${formatDate(d.decided_at)}` : ''
                  } — chose: ${d.chosen_label ?? '—'}${
                    d.chosen_price_pence !== null
                      ? ` (${gbp(d.chosen_price_pence)})`
                      : ''
                  }`
                : d.status === 'rejected'
                  ? `Rejected${
                      d.decided_at ? ` on ${formatDate(d.decided_at)}` : ''
                    }`
                  : `Status: ${d.status}`}
            </Text>
            {d.description && <Text style={styles.updateBody}>{d.description}</Text>}
          </View>
        ))}

        {/* Updates (compact) */}
        <Text style={styles.section}>Project updates (chronological)</Text>
        {updates.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 9 }}>No updates posted.</Text>
        )}
        {updates.map((u, i) => (
          <View key={i} style={styles.updateItem}>
            {u.headline && <Text style={styles.updateHead}>{u.headline}</Text>}
            <Text style={styles.updateMeta}>
              {u.posted_by_name} · {u.stage_name} · {formatDate(u.posted_at)}
            </Text>
            <Text style={styles.updateBody}>{u.body}</Text>
            {u.decision_needed && (
              <Text style={[styles.updateBody, { color: ACCENT, marginTop: 4 }]}>
                Decision raised: {u.decision_needed}
              </Text>
            )}
          </View>
        ))}

        {/* Invoices */}
        <Text style={styles.section}>Invoices</Text>
        {invoices.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 9 }}>No invoices issued.</Text>
        )}
        {invoices.map((inv) => (
          <View key={inv.number} style={styles.entry}>
            <Text style={styles.entryLeft}>
              {inv.number} · {formatDate(inv.issued_at, { short: true })}
            </Text>
            <Text style={styles.entryRight}>
              <Text style={styles.entryRightStrong}>{gbp(inv.amount_gbp_pence)}</Text>
              {'  ·  '}
              {inv.title}
              {'  ·  '}
              {inv.status}
              {inv.paid_at &&
                `  ·  paid ${formatDate(inv.paid_at, { short: true })}${
                  inv.paid_reference ? ` (ref ${inv.paid_reference})` : ''
                }`}
            </Text>
          </View>
        ))}

        {/* Builder bank/legal footer block — useful for record-keeping */}
        {(tenant.bank_account_name ||
          tenant.bank_sort_code ||
          tenant.bank_account_number) && (
          <>
            <Text style={styles.section}>Builder details (for your records)</Text>
            {tenant.bank_account_name && (
              <View style={styles.entry}>
                <Text style={styles.entryLeft}>Account name</Text>
                <Text style={styles.entryRight}>{tenant.bank_account_name}</Text>
              </View>
            )}
            {tenant.bank_sort_code && (
              <View style={styles.entry}>
                <Text style={styles.entryLeft}>Sort code</Text>
                <Text style={styles.entryRight}>{tenant.bank_sort_code}</Text>
              </View>
            )}
            {tenant.bank_account_number && (
              <View style={styles.entry}>
                <Text style={styles.entryLeft}>Account number</Text>
                <Text style={styles.entryRight}>{tenant.bank_account_number}</Text>
              </View>
            )}
            {tenant.bank_name && (
              <View style={styles.entry}>
                <Text style={styles.entryLeft}>Bank</Text>
                <Text style={styles.entryRight}>{tenant.bank_name}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Generated by Builders Ready · buildersready.uk</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Server-side render the handover PDF to a Node Buffer for upload.
 */
export async function renderHandoverPdfBuffer(
  data: HandoverData,
): Promise<Buffer> {
  const stream = await pdf(<HandoverDocument data={data} />).toBuffer();
  // toBuffer returns a NodeJS.ReadableStream; collect chunks.
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
