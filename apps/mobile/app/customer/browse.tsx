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
import { useFocusEffect, useRouter } from 'expo-router';
import { palette, spacing, typography, radius, budgetLabel, relativeTime, postcodeMatches } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { browseOpenJobs, listMyRequests, type JobListItem } from '../../lib/marketplace';

/**
 * The marketplace feed for customers — every open job, including the
 * customer's own (badged "Your job" and linked to their request). Opened
 * from the Marketplace card on Home.
 */
export default function CustomerBrowse() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [area, setArea] = useState('');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [mineIds, setMineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [feed, mine] = await Promise.all([
        browseOpenJobs({}),
        user_id ? listMyRequests(user_id) : Promise.resolve([]),
      ]);
      setJobs(feed);
      setMineIds(new Set(mine.map((m) => m.id)));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user_id]);

  const visible = area.trim() ? jobs.filter((j) => postcodeMatches(j.postcode, area)) : jobs;

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
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.subhead}>
        <Text style={styles.sub}>Open jobs posted near you</Text>
        <TouchableOpacity
          onPress={() => router.push('/customer/post')}
          activeOpacity={0.85}
          style={styles.postBtn}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.postBtnText}>Post a job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={palette.inkMuted} />
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder="Search by postcode (e.g. SW19)"
            placeholderTextColor={palette.inkMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {area.length > 0 && (
            <TouchableOpacity onPress={() => setArea('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={palette.inkMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : loadError ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={46} color={palette.inkMuted} />
          <Text style={styles.empty}>Couldn&apos;t load the marketplace. Please try again.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Go back</Text>
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
          {visible.length === 0 ? (
            <Text style={styles.empty}>No open jobs right now. Pull to refresh or widen your area.</Text>
          ) : (
            visible.map((j) => {
              const mine = mineIds.has(j.id);
              return (
                <TouchableOpacity
                  key={j.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(mine ? `/customer/request/${j.id}` : `/customer/job/${j.id}`)
                  }
                  style={[styles.card, mine && styles.cardMine]}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.tag}>{j.trade_category.toUpperCase()}</Text>
                    {mine ? (
                      <Text style={styles.mineTag}>YOUR JOB</Text>
                    ) : (
                      <Text style={styles.ago}>{relativeTime(j.created_at)}</Text>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{j.title}</Text>
                  <Text style={styles.loc}>{[j.city, j.postcode].filter(Boolean).join(' · ')}</Text>
                  <Text style={styles.budget}>
                    {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                  </Text>
                  {mine && <Text style={styles.mineLink}>View your quotes →</Text>}
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
  back: { width: 26 },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  subhead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  postBtnText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  filterWrap: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: palette.card,
  },
  searchInput: { flex: 1, fontSize: typography.size.body, color: palette.ink, padding: 0 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm, color: palette.inkMuted },
  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  errorBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  errorBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  card: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.card,
  },
  cardMine: { borderColor: palette.primary },
  mineTag: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  mineLink: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
    color: palette.primary,
    marginTop: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    color: '#fff',
    backgroundColor: palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  ago: { fontSize: typography.size.xs, color: palette.inkMuted },
  cardTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: spacing.sm },
  loc: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  budget: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: spacing.sm },
});
