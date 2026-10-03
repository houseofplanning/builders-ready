import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, typography, radius, budgetLabel, relativeTime } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { listOpenJobRequests, type JobListItem } from '../lib/marketplace';

export default function FindWorkScreen() {
  const router = useRouter();
  const { tenant, palette } = useTenant();
  const [area, setArea] = useState('');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await listOpenJobRequests({ area });
    setJobs(rows);
    setLoading(false);
    setRefreshing(false);
  }, [area]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tenant) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>Find Work is for trade accounts.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>Find work</Text>
      </View>

      <View style={styles.filterRow}>
        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="Filter by postcode area, e.g. SW"
          autoCapitalize="characters"
          placeholderTextColor={palette.inkMuted}
          style={[
            styles.input,
            { borderColor: palette.hairline, color: palette.ink, backgroundColor: palette.card },
          ]}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
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
          {jobs.length === 0 ? (
            <Text style={[styles.empty, { color: palette.inkMuted }]}>
              No open jobs match. Pull to refresh or widen your area.
            </Text>
          ) : (
            jobs.map((j) => (
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
                  <Text style={[styles.ago, { color: palette.inkMuted }]}>
                    {relativeTime(j.created_at)}
                  </Text>
                </View>
                <Text style={[styles.cardTitle, { color: palette.ink }]}>{j.title}</Text>
                <Text style={[styles.loc, { color: palette.inkMuted }]}>
                  {[j.city, j.postcode].filter(Boolean).join(' · ')}
                </Text>
                <Text style={[styles.budget, { color: palette.ink }]}>
                  {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  back: { padding: 4, marginRight: 4 },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800' },
  filterRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
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
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.sm,
  },
  loc: { fontSize: typography.size.sm, marginTop: 2 },
  budget: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.sm,
  },
});
