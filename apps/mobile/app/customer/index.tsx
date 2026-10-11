import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { listCustomerProjects, type CustomerProjectListItem } from '../../lib/marketplace';

const STATUS_LABEL: Record<string, string> = {
  active: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export default function CustomerHome() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [projects, setProjects] = useState<CustomerProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user_id) {
      setLoading(false);
      return;
    }
    try {
      setProjects(await listCustomerProjects(user_id));
    } catch {
      // Stop the spinner on failure so the screen isn't stuck; pull-to-refresh retries.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user_id]);

  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.sub}>Your projects and the marketplace</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/customer/account')} hitSlop={10}>
          <Ionicons name="person-circle-outline" size={28} color={palette.inkMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={palette.primary}
          />
        }
      >
        {/* MARKETPLACE CARD — mirrors the builder's home */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/customer/browse')}
          style={styles.mktCard}
        >
          <View style={styles.mktIcon}>
            <Ionicons name="briefcase" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.mktTitle}>Marketplace</Text>
            <Text style={styles.mktSub}>Post a job and get quotes from local trades</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.heading}>Your projects</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
        ) : projects.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="home-outline" size={46} color={palette.inkMuted} />
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.empty}>
              When you hire a trade from a quote, the job appears here and you can follow it
              start to finish.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/customer/browse')}
              activeOpacity={0.85}
              style={styles.emptyBtn}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Post a job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projects.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/customer/project/${p.id}`)}
              style={styles.card}
            >
              <View style={styles.cardHead}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.cardTrade}>{p.trade_name}</Text>
                </View>
                <Text style={styles.statusPill}>{STATUS_LABEL[p.status] ?? p.status}</Text>
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.percent}>{p.progress_percent}%</Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.min(100, Math.max(0, p.progress_percent))}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.openCta}>Open project</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.primary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: { fontSize: typography.size.xxl, fontWeight: typography.weightExtraBold as '800', color: palette.ink, letterSpacing: -0.5 },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },

  mktCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  mktIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  mktTitle: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: '#fff' },
  mktSub: { fontSize: typography.size.xs, marginTop: 2, lineHeight: 16, color: 'rgba(255,255,255,0.88)' },

  heading: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginBottom: spacing.md },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: spacing.md },
  empty: { textAlign: 'center', marginTop: spacing.sm, fontSize: typography.size.sm, color: palette.inkMuted, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  emptyBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },

  card: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  cardTrade: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  statusPill: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    color: palette.primary,
    backgroundColor: palette.canvas,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  percent: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink, minWidth: 52 },
  track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: palette.canvas, marginLeft: spacing.md, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999, backgroundColor: palette.primary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.md },
  openCta: { fontSize: typography.size.xs, fontWeight: typography.weightSemibold as '600', color: palette.primary, marginRight: 4 },
});
