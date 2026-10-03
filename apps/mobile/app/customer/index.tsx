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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, spacing, typography, radius, budgetLabel, relativeTime } from '@br/shared';
import { supabase } from '../../lib/supabase';
import { browseOpenJobs, type JobListItem } from '../../lib/marketplace';

export default function CustomerBrowse() {
  const router = useRouter();
  const [area, setArea] = useState('');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setJobs(await browseOpenJobs({ area }));
    setLoading(false);
    setRefreshing(false);
  }, [area]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Find a trade</Text>
          <Text style={styles.sub}>Open jobs posted near you</Text>
        </View>
        <TouchableOpacity onPress={onSignOut} hitSlop={10}>
          <Ionicons name="person-circle-outline" size={28} color={palette.inkMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/customer/post')}
        activeOpacity={0.85}
        style={styles.postBtn}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.postBtnText}>Post a job — it&rsquo;s free</Text>
      </TouchableOpacity>

      <TextInput
        value={area}
        onChangeText={setArea}
        placeholder="Filter by postcode area, e.g. SW"
        autoCapitalize="characters"
        placeholderTextColor={palette.inkMuted}
        style={styles.input}
      />

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
            <Text style={styles.empty}>No open jobs right now. Be the first to post one.</Text>
          ) : (
            jobs.map((j) => (
              <TouchableOpacity
                key={j.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/customer/job/${j.id}`)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.tag}>{j.trade_category.toUpperCase()}</Text>
                  <Text style={styles.ago}>{relativeTime(j.created_at)}</Text>
                </View>
                <Text style={styles.cardTitle}>{j.title}</Text>
                <Text style={styles.loc}>{[j.city, j.postcode].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.budget}>
                  {budgetLabel(j.budget_min_pence, j.budget_max_pence, j.budget_note)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
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
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  postBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  input: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
    color: palette.ink,
    backgroundColor: palette.card,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm, color: palette.inkMuted },
  card: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: palette.card,
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
