import 'server-only';
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';

/**
 * Planning Radar occupier letter — a simple, branded one-page letter a builder
 * prints and posts to the homeowner of a property with a planning application.
 * No homeowner contact data is used; it's addressed to "The Occupier".
 */

export interface LetterPdfData {
  tenant: {
    name: string;
    brand_primary: string | null;
    business_email: string | null;
    business_phone: string | null;
    logoDataUri?: string | null;
  };
  body: string; // editable letter body (plain text, paragraphs separated by blank lines)
  siteAddress: string;
  dateLabel: string;
}

function styles(brand: string) {
  return StyleSheet.create({
    page: { paddingTop: 54, paddingBottom: 54, paddingHorizontal: 56, fontSize: 11, color: '#1A2A30', lineHeight: 1.5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
    brand: { fontSize: 18, fontWeight: 700, color: brand },
    logoBox: { height: 46, width: 190, justifyContent: 'center' },
    logo: { maxHeight: 46, maxWidth: 190, objectFit: 'contain' },
    contact: { fontSize: 9, color: '#5F7480', textAlign: 'right' },
    rule: { height: 2, backgroundColor: brand, marginBottom: 24 },
    toBlock: { marginBottom: 18 },
    to: { fontSize: 11, color: '#1A2A30' },
    date: { fontSize: 10, color: '#5F7480', marginBottom: 18 },
    para: { marginBottom: 12 },
    footer: { position: 'absolute', bottom: 34, left: 56, right: 56, fontSize: 8, color: '#9AA9AF', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#E7ECEE', paddingTop: 8 },
  });
}

function LetterDocument({ data }: { data: LetterPdfData }) {
  const brand = data.tenant.brand_primary || '#0F4C5C';
  const s = styles(brand);
  const paras = data.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {data.tenant.logoDataUri ? (
            <View style={s.logoBox}>
              <Image src={data.tenant.logoDataUri} style={s.logo} />
            </View>
          ) : (
            <Text style={s.brand}>{data.tenant.name}</Text>
          )}
          <View>
            {!!data.tenant.business_phone && <Text style={s.contact}>{data.tenant.business_phone}</Text>}
            {!!data.tenant.business_email && <Text style={s.contact}>{data.tenant.business_email}</Text>}
          </View>
        </View>
        <View style={s.rule} />

        <Text style={s.date}>{data.dateLabel}</Text>
        <View style={s.toBlock}>
          <Text style={s.to}>The Occupier</Text>
          <Text style={s.to}>{data.siteAddress}</Text>
        </View>

        {paras.map((p, i) => (
          <Text key={i} style={s.para}>{p}</Text>
        ))}

        <Text style={s.footer}>Sent by {data.tenant.name} · powered by Builders Ready</Text>
      </Page>
    </Document>
  );
}

export async function renderLetterPdfBuffer(data: LetterPdfData): Promise<Buffer> {
  const stream = await pdf(<LetterDocument data={data} />).toBuffer();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
