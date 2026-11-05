import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { listOpenSubJobs, placeSubBid, type OpenSubJob } from '../../lib/for-hire';
import { ProfileToggle } from '../../components/profile-toggle';

export default function ForHireFindJobs() {
  const { tenant } = useTenant();
  const [rows, setRows] = useState<OpenSubJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) { setLoading(false); return; }
    try { setRows(await listOpenSubJobs(tenant.id)); } catch { /* retry */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [tenant]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function bid(job: OpenSubJob) {
    if (!tenant) return;
    setBusy(true);
    try {
      await placeSubBid({
        post_id: job.id,
        my_tenant_id: tenant.id,
        amount_pence: amount.trim() === '' ? null : Math.round(Number(amount) * 100),
        message: message || null,
      });
      setRows((p) => p.map((r) => (r.id === job.id ? { ...r, my_bid_status: 'submitted' } : r)));
      setOpenId(null); setAmount(''); setMessage('');
    } catch (e) {
      Alert.alert('Could not bid', e instanceof Error ? e.message : 'Try again.');
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <Text style={styles.title}>Find jobs</Text>
        <Text style={styles.sub}>Work other builders have posted</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={palette.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={palette.primary} />}
        >
          <ProfileToggle mode="forhire" />
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={palette.inkMuted} />
              <Text style={styles.emptyTitle}>No open jobs right now</Text>
              <Text style={styles.emptyBody}>Make sure "available for work" is on in Profile. New jobs from other builders show up here.</Text>
            </View>
          ) : (
            rows.map((j) => (
              <View key={j.id} style={styles.card}>
                <Text style={styles.job}>{j.title}</Text>
                <Text style={styles.meta}>{j.poster_name}{[j.trade, j.area, j.duration_note].filter(Boolean).length ? ' · ' : ''}{[j.trade, j.area, j.duration_note].filter(Boolean).join(' · ')}</Text>
                {j.description ? <Text style={styles.desc}>{j.description}</Text> : null}
                {j.budget_note ? <Text style={styles.meta}>Budget: {j.budget_note}</Text> : null}

                {j.my_bid_status ? (
                  <Text style={styles.bidState}>
                    {j.my_bid_status === 'accepted' ? '✓ You won this' : j.my_bid_status === 'declined' ? 'Not selected' : 'Bid sent'}
                  </Text>
                ) : openId === j.id ? (
                  <View style={styles.bidForm}>
                    <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Your price £ (optional)" placeholderTextColor={palette.inkMuted} style={styles.input} />
                    <TextInput value={message} onChangeText={setMessage} placeholder="A line about you / availability" placeholderTextColor={palette.inkMuted} style={[styles.input, { height: 64 }]} multiline />
                    <View style={styles.bidRow}>
                      <TouchableOpacity onPress={() => setOpenId(null)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => bid(j)} disabled={busy} style={styles.primaryBtn}><Text style={styles.primaryText}>{busy ? 'Sending…' : 'Send bid'}</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => { setOpenId(j.id); setAmount(''); setMessage(''); }} style={styles.bidBtn}>
                    <Text style={styles.bidBtnText}>Bid on this</Text>
                  </TouchableOpacity>
                )}
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
  card: { backgroundColor: palette.card, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.hairline, padding: spacing.md, marginBottom: spacing.sm },
  job: { fontSize: typography.size.md, fontWeight: typography.weightBold as '700', color: palette.ink },
  meta: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 3 },
  desc: { fontSize: typography.size.sm, color: palette.inkSoft, marginTop: 6 },
  bidState: { marginTop: 10, fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600', color: palette.inkMuted },
  bidBtn: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: palette.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 16 },
  bidBtnText: { color: palette.primary, fontWeight: typography.weightBold as '700', fontSize: typography.size.sm },
  bidForm: { marginTop: 10, gap: 8 },
  input: { borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: typography.size.sm, color: palette.ink },
  bidRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelBtn: { paddingVertical: 9, paddingHorizontal: 14 },
  cancelText: { color: palette.inkMuted, fontWeight: typography.weightSemibold as '600', fontSize: typography.size.sm },
  primaryBtn: { backgroundColor: palette.primary, paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.md },
  primaryText: { color: '#fff', fontWeight: typography.weightBold as '700', fontSize: typography.size.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weightBold as '700', color: palette.ink, marginTop: spacing.md },
  emptyBody: { fontSize: typography.size.sm, color: palette.inkMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
});
