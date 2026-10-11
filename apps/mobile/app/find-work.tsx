import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, typography, radius, budgetLabel, relativeTime, postcodeMatches, MARKETPLACE_BID_CAP } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { SelectField } from '../components/select-field';
import {
  listOpenJobRequests,
  listTradeWonJobs,
  type JobListItem,
  type TradeWonJob,
} from '../lib/marketplace';

type Segment = 'open' | 'hired' | 'completed';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Hired', value: 'hired' },
  { label: 'Completed', value: 'completed' },
];

export default function FindWorkScreen() {
  const router = useRouter();
  const { tenant, palette } = useTenant();
  const { setSelectedId } = useCurrentProject();
  const [segment, setSegment] = useState<Segment>('open');
  const [area, setArea] = useState('');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [won, setWon] = useState<TradeWonJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    try {
      if (segment === 'open') {
        setJobs(await listOpenJobRequests({}));
      } else {
        setWon(await listTradeWonJobs(tenant.id));
      }
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenant, segment]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  function openProject(projectId: string | null) {
    if (!projectId) return;
    setSelectedId(projectId);
    router.replace('/(tabs)');
  }

  const wonFiltered = won.filter((w) =>
    segment === 'completed'
      ? w.project_status === 'completed'
      : w.project_status !== 'completed',
  );

  const visibleJobs = area.trim() ? jobs.filter((j) => postcodeMatches(j.postcode, area)) : jobs;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Marketplace</Text>
        <TouchableOpacity onPress={() => router.push('/mkt-messages')} hitSlop={10}>
          <Ionicons name="chatbubbles-outline" size={24} color={palette.primary} />
        </TouchableOpacity>
      </View>

      {!tenant ? (
        <View style={styles.center}>
          <Text style={{ color: palette.inkMuted }}>The marketplace is for trade accounts.</Text>
        </View>
      ) : (
        <>
          {/* Status + area dropdowns */}
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <SelectField
                value={segment}
                onChange={(v) => {
                  setSegment(v as Segment);
                  setLoading(true);
                }}
                placeholder="Status"
                title="Show"
                options={STATUS_OPTIONS}
              />
            </View>
            {segment === 'open' && (
              <View style={[styles.searchBox, { flex: 1, borderColor: palette.hairline, backgroundColor: palette.card }]}>
                <Ionicons name="search" size={16} color={palette.inkMuted} />
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="Postcode (e.g. SW19)"
                  placeholderTextColor={palette.inkMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.searchInput, { color: palette.ink }]}
                />
                {area.length > 0 && (
                  <TouchableOpacity onPress={() => setArea('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={palette.inkMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
          ) : loadError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={42} color={palette.inkMuted} />
              <Text style={[styles.empty, { color: palette.inkMuted }]}>
                Couldn&apos;t load the marketplace. Pull to refresh or try again.
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.85}
                style={[styles.backBtn, { backgroundColor: palette.primary }]}
              >
                <Text style={styles.backBtnText}>Go back</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
              {segment === 'open' ? (
                visibleJobs.length === 0 ? (
                  <Text style={[styles.empty, { color: palette.inkMuted }]}>
                    No open jobs match. Pull to refresh or widen your area.
                  </Text>
                ) : (
                  visibleJobs.map((j) => (
                    <TouchableOpacity
                      key={j.id}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/find-work/${j.id}`)}
                      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.hairline }]}
                    >
                      <View style={styles.cardTop}>
                        <Text style={[styles.tag, { color: '#fff', backgroundColor: palette.primary }]}>
                          {j.trade_category.toUpperCase()}
                        </Text>
                        <Text style={[styles.ago, { color: palette.inkMuted }]}>{relativeTime(j.created_at)}</Text>
                      </View>
                      <Text style={[styles.cardTitle, { color: palette.ink }]}>{j.title}</Text>
                      <Text style={[styles.loc, { color: palette.inkMuted }]}>
                        {[j.city, j.postcode].filter(Boolean).join(' · ')}
                      </Text>
                      <View style={styles.cardFoot}>
                        <Text style={[styles.budget, { color: palette.ink }]}>
                          {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                        </Text>
                        {j.bid_count >= MARKETPLACE_BID_CAP ? (
                          <Text style={[styles.quotePill, { color: palette.inkMuted, backgroundColor: palette.canvas }]}>
                            Fully quoted
                          </Text>
                        ) : (
                          <Text style={[styles.quotePill, { color: palette.primary, backgroundColor: palette.canvas }]}>
                            {j.bid_count} of {MARKETPLACE_BID_CAP} quotes
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )
              ) : wonFiltered.length === 0 ? (
                <Text style={[styles.empty, { color: palette.inkMuted }]}>
                  {segment === 'hired'
                    ? 'No active hired jobs yet. Win a bid and it shows here.'
                    : 'No completed jobs yet.'}
                </Text>
              ) : (
                wonFiltered.map((w) => (
                  <TouchableOpacity
                    key={w.job_id}
                    activeOpacity={0.7}
                    onPress={() => openProject(w.project_id)}
                    style={[styles.card, { backgroundColor: palette.card, borderColor: palette.hairline }]}
                  >
                    <View style={styles.cardTop}>
                      <Text style={[styles.tag, { color: '#fff', backgroundColor: palette.primary }]}>
                        {w.trade_category.toUpperCase()}
                      </Text>
                      <Text style={[styles.ago, { color: palette.inkMuted }]}>
                        {w.project_status === 'completed' ? 'Completed' : 'In progress'}
                      </Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: palette.ink }]}>{w.title}</Text>
                    <Text style={[styles.loc, { color: palette.inkMuted }]}>
                      {[w.city, w.postcode].filter(Boolean).join(' · ')}
                    </Text>
                    {w.amount_pence != null && (
                      <Text style={[styles.budget, { color: palette.ink }]}>
                        {budgetLabel(w.amount_pence, w.amount_pence)}
                      </Text>
                    )}
                    <Text style={[styles.openCta, { color: palette.primary }]}>Open project →</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: typography.size.body, padding: 0 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  ago: { fontSize: typography.size.xs },
  cardTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', marginTop: spacing.sm },
  loc: { fontSize: typography.size.sm, marginTop: 2 },
  budget: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  quotePill: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  openCta: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700', marginTop: spacing.sm },
  backBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
  },
  backBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
