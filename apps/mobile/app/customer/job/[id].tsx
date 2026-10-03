import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, spacing, typography, radius, budgetLabel, relativeTime } from '@br/shared';
import { getFeedJob, type FeedJob } from '../../../lib/marketplace';

export default function FeedJobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<FeedJob | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setJob(await getFeedJob(id));
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
  if (!job) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <Text style={{ color: palette.inkMuted }}>This job is no longer open.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.htitle} numberOfLines={1}>
          {job.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.tag}>{job.trade_category.toUpperCase()}</Text>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.loc}>
          {[job.city, job.postcode].filter(Boolean).join(' · ')} · {relativeTime(job.created_at)}
        </Text>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>BUDGET</Text>
          <Text style={styles.statVal}>
            {budgetLabel(job.budget_min_pence, job.budget_max_pence, job.budget_note)}
          </Text>
        </View>

        {job.description ? <Text style={styles.desc}>{job.description}</Text> : null}

        <Text style={styles.note}>
          This is another customer&rsquo;s job. Trades on Builders Ready quote on jobs like these.
        </Text>

        <TouchableOpacity onPress={() => router.push('/customer/post')} style={styles.postBtn}>
          <Text style={styles.postBtnText}>Post your own job</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: { padding: 4, marginRight: 4 },
  htitle: { flex: 1, fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  tag: {
    alignSelf: 'flex-start',
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
  title: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: spacing.sm },
  loc: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  statCard: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: palette.card,
  },
  statLabel: { fontSize: 10, fontWeight: typography.weightBold as '700', color: palette.inkMuted, letterSpacing: 0.6 },
  statVal: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: 4 },
  desc: { fontSize: typography.size.body, color: palette.ink, marginTop: spacing.md, lineHeight: 21 },
  note: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: spacing.lg },
  postBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  postBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
