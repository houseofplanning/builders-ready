import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  palette,
  spacing,
  typography,
  radius,
  budgetLabel,
  jobRequestStatusLabel,
  type JobRequestStatus,
} from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { listMyRequests, type MyRequestItem } from '../../lib/marketplace';

export default function MyJobs() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [rows, setRows] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user_id) return;
    setRows(await listMyRequests(user_id));
    setLoading(false);
  }, [user_id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh when the tab regains focus so a just-posted job appears
  // without needing to reopen the app.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Text style={styles.title}>My jobs</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {rows.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="clipboard-outline" size={46} color={palette.inkMuted} />
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.empty}>
                Post a job and local trades will send you quotes.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/customer/post')}
                activeOpacity={0.85}
                style={styles.emptyBtn}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Post a job</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rows.map((r) => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/customer/request/${r.id}`)}
                style={styles.card}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.loc}>
                    {r.trade_category} ·{' '}
                    {budgetLabel(r.budget_min_pence, r.budget_max_pence, r.budget_note)}
                  </Text>
                  <Text style={[styles.status, statusColor(r.status)]}>
                    {jobRequestStatusLabel(r.status)}
                  </Text>
                </View>
                <Text style={styles.quotes}>
                  {r.quote_count} {r.quote_count === 1 ? 'quote' : 'quotes'} ›
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function statusColor(s: JobRequestStatus) {
  if (s === 'matched') return { color: '#0F6E56' };
  if (s === 'open') return { color: palette.primary };
  return { color: palette.inkMuted };
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: palette.card,
  },
  cardTitle: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  loc: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  status: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700', marginTop: 4 },
  quotes: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700', color: palette.primary },
});
