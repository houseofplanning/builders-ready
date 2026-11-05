import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { getMySchedule, confirmMyAssignment, shortAddress, type MyScheduleItem } from '../../lib/schedule';
import { ProfileToggle } from '../../components/profile-toggle';

const dayKey = (iso: string) => iso.slice(0, 10);
const dayHeading = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  if (same(d, today)) return `Today · ${label}`;
  if (same(d, tomorrow)) return `Tomorrow · ${label}`;
  return label;
};
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  planned: { label: 'To confirm', bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { label: 'Confirmed', bg: '#D1FAE5', fg: '#065F46' },
  in_progress: { label: 'On site', bg: '#DBEAFE', fg: '#1E40AF' },
  done: { label: 'Done', bg: palette.canvas, fg: palette.inkMuted },
  cancelled: { label: 'Cancelled', bg: palette.canvas, fg: palette.inkMuted },
};

export default function ForHireMyWork() {
  const [rows, setRows] = useState<MyScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows(await getMySchedule()); } catch { /* retry on pull */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function confirm(item: MyScheduleItem) {
    setBusyId(item.assignment_id);
    try {
      await confirmMyAssignment(item.assignment_id);
      setRows((p) => p.map((r) => (r.assignment_id === item.assignment_id ? { ...r, status: 'confirmed' } : r)));
    } catch { /* ignore */ } finally { setBusyId(null); }
  }

  const groups: { key: string; items: MyScheduleItem[] }[] = [];
  for (const r of rows) {
    const k = dayKey(r.starts_at);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(r);
    else groups.push({ key: k, items: [r] });
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <Text style={styles.title}>For Hire</Text>
        <Text style={styles.sub}>Jobs other builders have booked you on</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={palette.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={palette.primary} />}
        >
          <ProfileToggle mode="forhire" />
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="hammer-outline" size={40} color={palette.inkMuted} />
              <Text style={styles.emptyTitle}>No jobs yet</Text>
              <Text style={styles.emptyBody}>Turn on "available for work" in Profile so builders can find and hire you, then check Find jobs to bid.</Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={{ marginBottom: spacing.lg }}>
                <Text style={styles.dayHeading}>{dayHeading(g.items[0]!.starts_at)}</Text>
                {g.items.map((item) => {
                  const s = STATUS[item.status] ?? STATUS.planned!;
                  const addr = shortAddress(item);
                  return (
                    <View key={item.assignment_id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <Text style={styles.job} numberOfLines={1}>{item.project_name}</Text>
                        <View style={[styles.chip, { backgroundColor: s.bg }]}><Text style={[styles.chipText, { color: s.fg }]}>{s.label}</Text></View>
                      </View>
                      {item.business_name ? <Text style={styles.meta}>for {item.business_name}</Text> : null}
                      {item.stage_name ? <Text style={styles.meta}>Stage: {item.stage_name}</Text> : null}
                      {addr ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(addr)}`)}>
                          <Text style={styles.addr}><Ionicons name="location-outline" size={13} color={palette.primary} /> {addr}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <View style={styles.actions}>
                        {(item.business_phone || item.pm_phone) ? (
                          <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openURL(`tel:${item.pm_phone || item.business_phone}`)}>
                            <Ionicons name="call-outline" size={15} color={palette.primary} /><Text style={styles.secondaryText}>Call</Text>
                          </TouchableOpacity>
                        ) : <View />}
                        {item.status === 'planned' ? (
                          <TouchableOpacity style={styles.primaryBtn} disabled={busyId === item.assignment_id} onPress={() => confirm(item)}>
                            <Text style={styles.primaryText}>{busyId === item.assignment_id ? 'Confirming…' : "I'll be there"}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightBold as '700', color: palette.ink },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  dayHeading: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700', color: palette.inkSoft, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: palette.card, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.hairline, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  job: { flex: 1, fontSize: typography.size.md, fontWeight: typography.weightBold as '700', color: palette.ink },
  chip: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700' },
  meta: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 3 },
  addr: { fontSize: typography.size.sm, color: palette.primary, marginTop: 6, fontWeight: typography.weightSemibold as '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: palette.hairline },
  secondaryText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600', color: palette.primary },
  primaryBtn: { backgroundColor: palette.primary, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.md },
  primaryText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weightBold as '700', color: palette.ink, marginTop: spacing.md },
  emptyBody: { fontSize: typography.size.sm, color: palette.inkMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
});
