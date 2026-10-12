import 'server-only';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { gbp, formatDate } from '@br/shared';

/**
 * Builders Ready — payment receipt PDF, emailed to the client when an invoice
 * is marked paid (card, bank transfer, cash or manual).
 */

const INK = '#0B1418';
const MUTED = '#5F7480';
const HAIRLINE = '#E1E6E9';
const CANVAS = '#F4F6F7';
const GREEN = '#2E7D32';

export interface ReceiptPdfData {
  businessName: string;
  brandPrimary: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  vatNumber: string | null;
  companyNumber: string | null;
  clientName: string | null;
  projectName: string | null;
  invoiceNumber: string;
  invoiceTitle: string;
  amountPence: number;
  paidAt: string; // ISO
  method: string | null; // card | bank | bank_transfer | cash | manual
  reference: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  card: 'Card',
  bank: 'Bank transfer',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  manual: 'Manual',
};

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
    brand: { fontSize: 16, fontWeight: 700, color: INK },
    docTag: { fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'right' },
    docNumber: { fontSize: 13, fontWeight: 700, color: INK, textAlign: 'right', marginTop: 2 },
    paidPill: {
      alignSelf: 'flex-start',
      backgroundColor: '#E8F7F0',
      color: GREEN,
      fontSize: 11,
      fontWeight: 700,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 4,
      marginBottom: 16,
    },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    metaCol: { width: '48%' },
    metaLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    metaValue: { fontSize: 10, color: INK, lineHeight: 1.4 },
    box: {
      backgroundColor: CANVAS,
      borderRadius: 4,
      padding: 14,
      marginTop: 6,
    },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    lineLabel: { fontSize: 10, color: MUTED },
    lineValue: { fontSize: 10, color: INK },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginTop: 6,
      borderTopWidth: 2,
      borderTopColor: primary,
    },
    grandLabel: { fontSize: 12, fontWeight: 700, color: INK },
    grandValue: { fontSize: 16, fontWeight: 700, color: GREEN },
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

function ReceiptDocument({ data }: { data: ReceiptPdfData }) {
  const primary = data.brandPrimary || '#0F4C5C';
  const s = makeStyles(primary);
  const methodLabel = data.method ? METHOD_LABEL[data.method] ?? data.method : '—';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>{data.businessName}</Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
              Receipt issued with Builders Ready
            </Text>
          </View>
          <View>
            <Text style={s.docTag}>Payment receipt</Text>
            <Text style={s.docNumber}>{data.invoiceNumber}</Text>
            <Text style={{ fontSize: 8, color: MUTED, textAlign: 'right', marginTop: 3 }}>
              {formatDate(data.paidAt)}
            </Text>
          </View>
        </View>

        <Text style={s.paidPill}>PAID</Text>

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Billed to</Text>
            <Text style={s.metaValue}>{data.clientName ?? 'Client'}</Text>
            {data.projectName ? <Text style={s.metaValue}>{data.projectName}</Text> : null}
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.metaValue}>{data.businessName}</Text>
            {data.businessEmail ? <Text style={s.metaValue}>{data.businessEmail}</Text> : null}
            {data.businessPhone ? <Text style={s.metaValue}>{data.businessPhone}</Text> : null}
            {data.vatNumber ? <Text style={s.metaValue}>VAT: {data.vatNumber}</Text> : null}
            {data.companyNumber ? <Text style={s.metaValue}>Company no: {data.companyNumber}</Text> : null}
          </View>
        </View>

        <View style={s.box}>
          <View style={s.lineRow}>
            <Text style={s.lineLabel}>Invoice</Text>
            <Text style={s.lineValue}>
              {data.invoiceNumber} — {data.invoiceTitle}
            </Text>
          </View>
          <View style={s.lineRow}>
            <Text style={s.lineLabel}>Payment method</Text>
            <Text style={s.lineValue}>{methodLabel}</Text>
          </View>
          <View style={s.lineRow}>
            <Text style={s.lineLabel}>Date paid</Text>
            <Text style={s.lineValue}>{formatDate(data.paidAt)}</Text>
          </View>
          {data.reference ? (
            <View style={s.lineRow}>
              <Text style={s.lineLabel}>Reference</Text>
              <Text style={s.lineValue}>{data.reference}</Text>
            </View>
          ) : null}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Amount paid</Text>
            <Text style={s.grandValue}>{gbp(data.amountPence)}</Text>
          </View>
        </View>

        <Text style={s.note}>
          Thank you. This is your receipt confirming the above invoice has been paid in full.
          No further action is needed.
        </Text>

        <View style={s.footer} fixed>
          <Text>{data.businessName}</Text>
          <Text>{data.invoiceNumber} · Receipt</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdfBuffer(data: ReceiptPdfData): Promise<Buffer> {
  const stream = await pdf(<ReceiptDocument data={data} />).toBuffer();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
