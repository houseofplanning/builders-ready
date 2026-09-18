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
  Estimate,
  EstimateLineItem,
  Tenant,
} from '@br/shared';
import { gbp, formatDate, ESTIMATE_LINE_KIND_LABELS, VAT_MODE_NOTE } from '@br/shared';

/**
 * Builders Ready — Quote / Estimate PDF.
 *
 * Rendered server-side and either emailed to the client or offered as a
 * download from the shareable link. Branded with the tenant's primary colour.
 */

const INK = '#0B1418';
const MUTED = '#5F7480';
const HAIRLINE = '#E1E6E9';
const CANVAS = '#F4F6F7';

export interface EstimatePdfData {
  tenant: Pick<
    Tenant,
    | 'name'
    | 'brand_primary'
    | 'business_email'
    | 'business_phone'
    | 'vat_number'
    | 'company_number'
  >;
  estimate: Estimate;
  lines: EstimateLineItem[];
}

function makeStyles(primary: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      color: INK,
      fontSize: 10,
      paddingTop: 44,
      paddingBottom: 54,
      paddingHorizontal: 44,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 2,
      borderBottomColor: primary,
      paddingBottom: 12,
      marginBottom: 18,
    },
    brand: { fontSize: 16, fontWeight: 700, letterSpacing: 1, color: INK },
    brandReady: { color: primary },
    docTag: {
      fontSize: 9,
      color: MUTED,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      textAlign: 'right',
    },
    docNumber: {
      fontSize: 13,
      fontWeight: 700,
      color: INK,
      textAlign: 'right',
      marginTop: 2,
    },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    metaCol: { width: '48%' },
    metaLabel: {
      fontSize: 8,
      color: MUTED,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 3,
    },
    metaValue: { fontSize: 10, color: INK, lineHeight: 1.4 },
    title: { fontSize: 15, fontWeight: 700, color: INK, marginBottom: 14 },
    tableHead: {
      flexDirection: 'row',
      backgroundColor: CANVAS,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 3,
    },
    th: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
    row: {
      flexDirection: 'row',
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: HAIRLINE,
    },
    cDesc: { width: '54%', paddingRight: 8 },
    cQty: { width: '18%', textAlign: 'right' },
    cPrice: { width: '28%', textAlign: 'right' },
    lineDesc: { fontSize: 10, color: INK },
    lineKind: { fontSize: 8, color: MUTED, marginTop: 1 },
    cell: { fontSize: 10, color: INK },
    totals: { marginTop: 14, alignSelf: 'flex-end', width: '46%' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    totalLabel: { fontSize: 10, color: MUTED },
    totalValue: { fontSize: 10, color: INK },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 8,
      marginTop: 6,
      borderTopWidth: 2,
      borderTopColor: primary,
    },
    grandLabel: { fontSize: 12, fontWeight: 700, color: INK },
    grandValue: { fontSize: 14, fontWeight: 700, color: INK },
    note: { fontSize: 9, color: MUTED, marginTop: 16, lineHeight: 1.5 },
    footer: {
      position: 'absolute',
      bottom: 26,
      left: 44,
      right: 44,
      borderTopWidth: 1,
      borderTopColor: HAIRLINE,
      paddingTop: 8,
      fontSize: 8,
      color: MUTED,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
}

function EstimateDocument({ data }: { data: EstimatePdfData }) {
  const { tenant, estimate, lines } = data;
  const primary = tenant.brand_primary || '#0F4C5C';
  const s = makeStyles(primary);
  const site = [
    estimate.site_address_line1,
    estimate.site_address_line2,
    estimate.city,
    estimate.postcode,
  ]
    .filter(Boolean)
    .join(', ');
  const vatNote = VAT_MODE_NOTE[estimate.vat_mode];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>
              {tenant.name}
            </Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
              Quotation prepared with Builders Ready
            </Text>
          </View>
          <View>
            <Text style={s.docTag}>Quotation</Text>
            <Text style={s.docNumber}>{estimate.number}</Text>
            <Text style={{ fontSize: 8, color: MUTED, textAlign: 'right', marginTop: 3 }}>
              {formatDate(estimate.created_at)}
            </Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Prepared for</Text>
            <Text style={s.metaValue}>{estimate.client_name}</Text>
            {site ? <Text style={s.metaValue}>{site}</Text> : null}
            {estimate.client_email ? (
              <Text style={s.metaValue}>{estimate.client_email}</Text>
            ) : null}
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.metaValue}>{tenant.name}</Text>
            {tenant.business_email ? (
              <Text style={s.metaValue}>{tenant.business_email}</Text>
            ) : null}
            {tenant.business_phone ? (
              <Text style={s.metaValue}>{tenant.business_phone}</Text>
            ) : null}
            {tenant.vat_number ? (
              <Text style={s.metaValue}>VAT: {tenant.vat_number}</Text>
            ) : null}
          </View>
        </View>

        <Text style={s.title}>{estimate.title}</Text>

        <View style={s.tableHead}>
          <Text style={[s.th, s.cDesc]}>Description</Text>
          <Text style={[s.th, s.cQty]}>Qty</Text>
          <Text style={[s.th, s.cPrice]}>Amount</Text>
        </View>
        {lines.map((l) => (
          <View style={s.row} key={l.id} wrap={false}>
            <View style={s.cDesc}>
              <Text style={s.lineDesc}>{l.description}</Text>
              <Text style={s.lineKind}>{ESTIMATE_LINE_KIND_LABELS[l.kind]}</Text>
            </View>
            <Text style={[s.cell, s.cQty]}>
              {Number(l.quantity)} {l.unit}
            </Text>
            <Text style={[s.cell, s.cPrice]}>{gbp(Number(l.line_price_pence))}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{gbp(Number(estimate.subtotal_pence))}</Text>
          </View>
          {estimate.vat_mode === 'standard' ? (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VAT (20%)</Text>
              <Text style={s.totalValue}>{gbp(Number(estimate.vat_pence))}</Text>
            </View>
          ) : null}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{gbp(Number(estimate.total_pence))}</Text>
          </View>
        </View>

        {vatNote ? <Text style={s.note}>{vatNote}</Text> : null}
        {estimate.notes ? <Text style={s.note}>{estimate.notes}</Text> : null}
        {estimate.valid_until ? (
          <Text style={s.note}>
            This quotation is valid until {formatDate(estimate.valid_until)}.
          </Text>
        ) : null}

        <View style={s.footer} fixed>
          <Text>{tenant.name}</Text>
          <Text>{estimate.number}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderEstimatePdfBuffer(
  data: EstimatePdfData,
): Promise<Buffer> {
  const stream = await pdf(<EstimateDocument data={data} />).toBuffer();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
