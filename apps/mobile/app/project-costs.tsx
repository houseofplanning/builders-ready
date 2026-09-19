import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  gbp,
  formatDate,
  COST_CATEGORY_LABELS,
  COST_CATEGORIES,
} from '@br/shared';
import type { CostCategory } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  listCosts,
  getProjectMargin,
  deleteCost,
  getReceiptUrl,
  type CostListItem,
  type ProjectMargin,
} from '../lib/costs';

export default function ProjectCostsScreen() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const { current } = useCurrentProject();
  const projectId = current?.project.id;

  const [margin, setMargin] = useState<ProjectMargin | null>(null);
  const [costs, setCosts] = useState<CostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = role === 'owner' || role === 'pm';

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [m, c] = await Promise.all([
      getProjectMargin(projectId),
      listCosts(projectId),
    ]);
    setMargin(m);
    setCosts(c);
    setLoading(false);
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!canManage) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>Not available.</Text>
      </SafeAreaView>
    );
  }

  function onDelete(c: CostListItem) {
    Alert.alert('Delete this cost?', `${c.description} — ${gbp(c.amount_pence)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCost(c.id);
            await load();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Error');
          }
        },
      },
    ]);
  }

  async function openReceipt(path: string) {
    const url = await getReceiptUrl(path);
    if (url) Linking.openURL(url);
  }

  const marginPositive = (margin?.margin_pence ?? 0) >= 0;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: palette.card, borderBottomColor: palette.hairline },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Costs & margin</Text>
        <TouchableOpacity onPress={() => router.push('/add-cost')} hitSlop={10}>
          <Ionicons name="add" size={28} color={palette.primary} />
        </TouchableOpacity>
      </View>

      {loading && !margin ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          {/* MARGIN CARD */}
          {margin && (
            <View
              style={[
                styles.marginCard,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <Text style={[styles.marginLabel, { color: palette.inkMuted }]}>
                Margin so far
              </Text>
              <Text
                style={[
                  styles.marginValue,
                  { color: marginPositive ? palette.success : palette.error },
                ]}
              >
                {gbp(margin.margin_pence)}
              </Text>
              <Text style={[styles.marginPct, { color: palette.inkMuted }]}>
                {Math.round(margin.margin_percent)}% of contract value
              </Text>

              <View style={[styles.divider, { backgroundColor: palette.hairline }]} />

              <Row label="Contract value" value={gbp(margin.contract_value_pence)} palette={palette} />
              <Row label="Cost to date" value={gbp(margin.cost_to_date_pence)} palette={palette} />
              {margin.budgeted_cost_pence != null && (
                <>
                  <Row
                    label="Budgeted cost (quote)"
                    value={gbp(margin.budgeted_cost_pence)}
                    palette={palette}
                  />
                  <Row
                    label={
                      (margin.cost_variance_pence ?? 0) > 0
                        ? 'Over budget by'
                        : 'Under budget by'
                    }
                    value={gbp(Math.abs(margin.cost_variance_pence ?? 0))}
                    palette={palette}
                    valueColor={
                      (margin.cost_variance_pence ?? 0) > 0 ? palette.error : palette.success
                    }
                  />
                </>
              )}
            </View>
          )}

          {/* BY CATEGORY */}
          {margin && margin.cost_to_date_pence > 0 && (
            <View
              style={[
                styles.catCard,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <Text style={[styles.catTitle, { color: palette.inkMuted }]}>
                Costs by category
              </Text>
              {COST_CATEGORIES.filter((k) => margin.by_category[k] > 0).map((k) => (
                <Row
                  key={k}
                  label={COST_CATEGORY_LABELS[k]}
                  value={gbp(margin.by_category[k])}
                  palette={palette}
                />
              ))}
            </View>
          )}

          {/* COSTS LIST */}
          <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
            Logged costs
          </Text>
          {costs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                No costs logged yet. Tap ＋ to add materials, labour, plant or a
                subbie&rsquo;s invoice — snap the receipt while you&rsquo;re at it.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/add-cost')}
                style={[styles.addBtn, { backgroundColor: palette.primary }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add a cost</Text>
              </TouchableOpacity>
            </View>
          ) : (
            costs.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.costRow,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.costDesc, { color: palette.ink }]}>
                    {c.description}
                  </Text>
                  <Text style={[styles.costMeta, { color: palette.inkMuted }]}>
                    {COST_CATEGORY_LABELS[c.category as CostCategory]}
                    {c.supplier ? ` · ${c.supplier}` : ''} ·{' '}
                    {formatDate(c.incurred_on, { short: true })}
                  </Text>
                  {c.receipt_storage_path && (
                    <TouchableOpacity
                      onPress={() => openReceipt(c.receipt_storage_path!)}
                      hitSlop={6}
                      style={styles.receiptLink}
                    >
                      <Ionicons name="receipt-outline" size={13} color={palette.primary} />
                      <Text style={[styles.receiptText, { color: palette.primary }]}>
                        View receipt
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.costAmount, { color: palette.ink }]}>
                    {gbp(c.amount_pence)}
                  </Text>
                  <TouchableOpacity onPress={() => onDelete(c)} hitSlop={8} style={{ marginTop: 6 }}>
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.footNote, { color: palette.inkMuted }]}>
            Costs and margin are only visible to you and your team — never to the
            client.
          </Text>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  palette,
  valueColor,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useTenant>['palette'];
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.inkMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? palette.ink }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  scroll: { padding: spacing.lg },
  marginCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  marginLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  marginValue: {
    fontSize: typography.size.display,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -1,
    marginTop: 2,
  },
  marginPct: { fontSize: typography.size.sm, marginTop: 2 },
  divider: { height: 1, marginVertical: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLabel: { fontSize: typography.size.body },
  rowValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  catCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  catTitle: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: typography.weightSemibold as '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyBody: {
    fontSize: typography.size.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  addBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  costDesc: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  costMeta: { fontSize: typography.size.xs, marginTop: 2 },
  receiptLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  receiptText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
  },
  costAmount: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
  },
  footNote: {
    fontSize: typography.size.xs,
    lineHeight: 17,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
