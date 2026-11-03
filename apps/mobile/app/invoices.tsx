import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { spacing, typography, radius, gbp } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  listInvoicesForProject,
  raiseMilestoneInvoice,
  type InvoiceListItem,
} from '../lib/invoices';
import { getContract, type ContractMilestone } from '../lib/contracts';
import { InvoiceCard } from '../components/invoice-card';

type Section =
  | { kind: 'header'; label: string; total?: number }
  | { kind: 'item'; data: InvoiceListItem };

export default function InvoicesScreen() {
  const router = useRouter();
  const { role, palette, user_id } = useTenant();
  const { current } = useCurrentProject();
  const canCreate = role === 'owner' || role === 'pm';

  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [raisingId, setRaisingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!current) {
      setItems([]);
      setMilestones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [invs, contract] = await Promise.all([
      listInvoicesForProject(current.project.id),
      canCreate ? getContract(current.project.id) : Promise.resolve(null),
    ]);
    setItems(invs);
    setMilestones(
      (contract?.milestones ?? []).filter(
        (m) => !m.invoice_id && m.amount_resolved_pence > 0,
      ),
    );
    setLoading(false);
  }, [current, canCreate]);

  async function onRaiseMilestone(m: ContractMilestone) {
    if (!user_id) return;
    setRaisingId(m.id);
    try {
      await raiseMilestoneInvoice(m.id, user_id);
      await load();
    } catch (err) {
      Alert.alert('Could not raise invoice', err instanceof Error ? err.message : 'Error');
    } finally {
      setRaisingId(null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  // Sort: outstanding (overdue first, then sent), then paid, then cancelled/draft
  const outstanding = items
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .sort((a, b) => {
      if (a.isOverdueVisual !== b.isOverdueVisual) {
        return a.isOverdueVisual ? -1 : 1;
      }
      return a.due_at.localeCompare(b.due_at);
    });
  const paid = items
    .filter((i) => i.status === 'paid')
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));
  const other = items.filter(
    (i) => i.status !== 'sent' && i.status !== 'overdue' && i.status !== 'paid',
  );

  const outstandingTotal = outstanding.reduce(
    (sum, i) => sum + i.amount_gbp_pence,
    0,
  );

  const sections: Section[] = [];
  if (outstanding.length > 0) {
    sections.push({
      kind: 'header',
      label: `Outstanding · ${outstanding.length}`,
      total: outstandingTotal,
    });
    outstanding.forEach((i) => sections.push({ kind: 'item', data: i }));
  }
  if (paid.length > 0) {
    sections.push({ kind: 'header', label: `Paid · ${paid.length}` });
    paid.forEach((i) => sections.push({ kind: 'item', data: i }));
  }
  if (other.length > 0) {
    sections.push({ kind: 'header', label: 'Other' });
    other.forEach((i) => sections.push({ kind: 'item', data: i }));
  }

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top']}
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
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          Invoices
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s, i) =>
          s.kind === 'header' ? `h-${s.label}-${i}` : s.data.id
        }
        ListHeaderComponent={
          current ? (
            <View>
              <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
                {current.project.name}
                {items.length === 0 ? ' · No invoices yet on this project.' : ''}
              </Text>
              {canCreate && milestones.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
                  <Text style={[styles.sectionHeader, { color: palette.inkMuted, marginBottom: spacing.xs }]}>
                    From your contract
                  </Text>
                  <View
                    style={[
                      styles.contractCard,
                      { backgroundColor: palette.card, borderColor: palette.hairline },
                    ]}
                  >
                    {milestones.map((m, i) => (
                      <View
                        key={m.id}
                        style={[
                          styles.msRow,
                          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.hairline },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.msName, { color: palette.ink }]}>
                            {m.name}
                            {m.is_retention ? '  · retention' : ''}
                          </Text>
                          <Text style={[styles.msMeta, { color: palette.inkMuted }]}>
                            {m.percent != null ? `${m.percent}% of contract` : 'Fixed amount'} · {gbp(m.amount_resolved_pence)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => onRaiseMilestone(m)}
                          disabled={raisingId === m.id}
                          style={[styles.raiseBtn, { backgroundColor: palette.primary, opacity: raisingId === m.id ? 0.6 : 1 }]}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.raiseBtnText}>
                            {raisingId === m.id ? '…' : m.is_retention ? 'Release' : 'Raise'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.contractHint, { color: palette.inkMuted }]}>
                    Raising bills the client for that milestone and links it to the contract. Or use + for a custom invoice.
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="card-outline"
                size={42}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No invoices yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                {canCreate
                  ? 'Send your first invoice — the client gets bank details to pay you by transfer.'
                  : 'Your PM will issue invoices here. You’ll see bank details to pay by transfer.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeader, { color: palette.inkMuted }]}>
                  {item.label}
                </Text>
                {typeof item.total === 'number' && item.total > 0 && (
                  <Text style={[styles.sectionTotal, { color: palette.ink }]}>
                    {gbp(item.total)}
                  </Text>
                )}
              </View>
            );
          }
          return (
            <InvoiceCard
              invoice={item.data}
              onPress={() => router.push(`/invoice/${item.data.id}`)}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={
          items.length === 0 ? styles.flexGrow : { paddingBottom: spacing.xxl }
        }
      />

      {canCreate && (
        <TouchableOpacity
          onPress={() => router.push('/create-invoice')}
          activeOpacity={0.85}
          style={[
            styles.fab,
            { backgroundColor: palette.primary, shadowColor: palette.ink },
          ]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  subtitle: {
    fontSize: typography.size.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTotal: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.2,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  emptyBody: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  flexGrow: { flexGrow: 1 },
  contractCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  msName: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  msMeta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  raiseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  raiseBtnText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
  },
  contractHint: {
    fontSize: typography.size.xs,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});
