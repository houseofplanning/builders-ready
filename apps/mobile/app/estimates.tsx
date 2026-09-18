import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { spacing, typography, radius, gbp, formatDate } from '@br/shared';
import type { EstimateStatus } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { listEstimates, type EstimateListItem } from '../lib/estimates';

function statusStyle(
  status: EstimateStatus,
  palette: ReturnType<typeof useTenant>['palette'],
): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'sent':
      return { label: 'Sent', bg: palette.infoSoft, fg: palette.info };
    case 'accepted':
      return { label: 'Accepted', bg: palette.successSoft, fg: palette.success };
    case 'declined':
      return { label: 'Declined', bg: palette.errorSoft, fg: palette.error };
    case 'expired':
      return { label: 'Expired', bg: palette.canvas, fg: palette.inkMuted };
    case 'draft':
    default:
      return { label: 'Draft', bg: palette.canvas, fg: palette.inkMuted };
  }
}

export default function EstimatesScreen() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const [items, setItems] = useState<EstimateListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listEstimates();
    setItems(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const canCreate = role === 'owner' || role === 'pm';

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
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Quotes</Text>
        {canCreate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity
              onPress={() => router.push('/estimate-rates')}
              hitSlop={10}
            >
              <Ionicons name="pricetags-outline" size={22} color={palette.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/create-estimate')}
              hitSlop={10}
            >
              <Ionicons name="add" size={28} color={palette.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} />
          }
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="calculator-outline"
                size={52}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No quotes yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                Build a quote on site in a couple of minutes. Win it and it turns
                into a project automatically.
              </Text>
              {canCreate && (
                <TouchableOpacity
                  onPress={() => router.push('/create-estimate')}
                  activeOpacity={0.85}
                  style={[styles.emptyCta, { backgroundColor: palette.primary }]}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyCtaText}>New quote</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            items.map((e) => {
              const s = statusStyle(e.status, palette);
              return (
                <TouchableOpacity
                  key={e.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/estimate/${e.id}`)}
                  style={[
                    styles.card,
                    { backgroundColor: palette.card, borderColor: palette.hairline },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardNumber, { color: palette.inkMuted }]}>
                      {e.number}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.pillText, { color: s.fg }]}>
                        {s.label}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: palette.ink }]}
                    numberOfLines={1}
                  >
                    {e.title}
                  </Text>
                  <Text style={[styles.cardClient, { color: palette.inkMuted }]}>
                    {e.client_name}
                  </Text>
                  <View style={styles.cardBottom}>
                    <Text style={[styles.cardTotal, { color: palette.ink }]}>
                      {gbp(e.total_pence)}
                    </Text>
                    <Text style={[styles.cardMeta, { color: palette.inkMuted }]}>
                      {e.valid_until
                        ? `Valid until ${formatDate(e.valid_until, { short: true })}`
                        : formatDate(e.created_at, { short: true })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.md,
  },
  emptyBody: {
    fontSize: typography.size.body,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardNumber: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    letterSpacing: 0.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
  },
  cardClient: {
    fontSize: typography.size.sm,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  cardTotal: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  cardMeta: {
    fontSize: typography.size.xs,
  },
});
