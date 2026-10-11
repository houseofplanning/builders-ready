import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, spacing, typography, radius, gbp } from '@br/shared';
import { getCustomerQuote, type CustomerQuote } from '../../../lib/marketplace';

export default function CustomerQuoteView() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quote, setQuote] = useState<CustomerQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setQuote(await getCustomerQuote(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }
  if (!quote) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <Text style={{ color: palette.inkMuted }}>This quote isn&rsquo;t available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.htitle}>Full quote</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.number}>{quote.number}</Text>
        <Text style={styles.title}>{quote.title}</Text>

        <View style={styles.card}>
          {quote.lines.length === 0 ? (
            <Text style={styles.muted}>The builder hasn&rsquo;t added line items yet.</Text>
          ) : (
            quote.lines.map((l, i) => (
              <View key={i} style={[styles.lineRow, i > 0 && styles.lineDivider]}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.lineDesc}>{l.description || 'Item'}</Text>
                  {l.quantity ? (
                    <Text style={styles.lineQty}>
                      {l.quantity} {l.unit}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.linePrice}>{gbp(l.line_price_pence)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totals}>
          <Row label="Subtotal" value={gbp(quote.subtotal_pence)} />
          {quote.vat_mode !== 'none' && <Row label="VAT" value={gbp(quote.vat_pence)} />}
          <Row label="Total" value={gbp(quote.total_pence)} bold />
        </View>

        {quote.notes ? (
          <>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.body}>{quote.notes}</Text>
          </>
        ) : null}
        {quote.terms ? (
          <>
            <Text style={styles.sectionLabel}>Terms</Text>
            <Text style={styles.body}>{quote.terms}</Text>
          </>
        ) : null}

        <Text style={styles.foot}>
          To accept this quote, hire the builder from your job&rsquo;s quotes list.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
    backgroundColor: palette.card,
  },
  htitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  number: { fontSize: typography.size.xs, color: palette.inkMuted, fontWeight: typography.weightBold as '700', letterSpacing: 0.4 },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: 2, marginBottom: spacing.md },
  card: { borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.lg, backgroundColor: palette.card, paddingHorizontal: spacing.md },
  muted: { fontSize: typography.size.sm, color: palette.inkMuted, paddingVertical: spacing.md },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm },
  lineDivider: { borderTopWidth: 1, borderTopColor: palette.hairline },
  lineDesc: { fontSize: typography.size.body, color: palette.ink, fontWeight: typography.weightSemibold as '600' },
  lineQty: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  linePrice: { fontSize: typography.size.body, color: palette.ink, fontWeight: typography.weightBold as '700' },
  totals: { marginTop: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: typography.size.body, color: palette.inkMuted },
  totalValue: { fontSize: typography.size.body, color: palette.ink, fontWeight: typography.weightBold as '700' },
  totalBold: { color: palette.ink, fontWeight: typography.weightExtraBold as '800', fontSize: typography.size.lg },
  sectionLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    color: palette.inkMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  body: { fontSize: typography.size.sm, color: palette.ink, lineHeight: 20 },
  foot: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: spacing.xl, lineHeight: 18 },
});
