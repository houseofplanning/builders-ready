import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { palette, spacing, typography, radius, TRADE_CATEGORIES } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { getForHireProfile, saveForHireProfile, type ForHireProfile } from '../../lib/for-hire';
import { ProfileToggle } from '../../components/profile-toggle';

export default function ForHireProfileScreen() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<ForHireProfile>({ discoverable: false, day_rate_pence: null, day_rate_unit: 'day', for_hire_trades: [], service_area: null });
  const [rate, setRate] = useState('');

  const load = useCallback(async () => {
    if (!tenant) { setLoading(false); return; }
    try {
      const prof = await getForHireProfile(tenant.id);
      setP(prof);
      setRate(prof.day_rate_pence != null ? String(Math.round(prof.day_rate_pence / 100)) : '');
    } catch { /* retry */ } finally { setLoading(false); }
  }, [tenant]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function toggleTrade(t: string) {
    setP((prev) => ({ ...prev, for_hire_trades: prev.for_hire_trades.includes(t) ? prev.for_hire_trades.filter((x) => x !== t) : [...prev.for_hire_trades, t] }));
  }

  async function save() {
    if (!tenant) return;
    setSaving(true);
    try {
      await saveForHireProfile(tenant.id, {
        ...p,
        day_rate_pence: rate.trim() === '' ? null : Math.round(Number(rate) * 100),
      });
      Alert.alert('Saved', 'Your For Hire profile is updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally { setSaving(false); }
  }

  if (loading) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}><View style={styles.center}><ActivityIndicator color={palette.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>What other builders see when they look to hire you</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProfileToggle mode="forhire" />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.cardTitle}>Available for work</Text>
              <Text style={styles.cardSub}>On = you appear in the directory and can bid on jobs.</Text>
            </View>
            <Switch value={p.discoverable} onValueChange={(v) => setP((prev) => ({ ...prev, discoverable: v }))} trackColor={{ true: palette.primary }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Advertised rate (optional)</Text>
          <View style={styles.rateRow}>
            <View style={styles.rateInputWrap}>
              <Text style={styles.poundSign}>£</Text>
              <TextInput value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={palette.inkMuted} style={styles.rateInput} />
            </View>
            {(['day', 'hour'] as const).map((u) => (
              <TouchableOpacity key={u} onPress={() => setP((prev) => ({ ...prev, day_rate_unit: u }))} style={[styles.unitBtn, p.day_rate_unit === u && { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                <Text style={[styles.unitText, { color: p.day_rate_unit === u ? '#fff' : palette.inkMuted }]}>per {u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>A public starting point. What you actually agree with a builder stays private.</Text>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Area you cover</Text>
          <TextInput
            value={p.service_area ?? ''}
            onChangeText={(t) => setP((prev) => ({ ...prev, service_area: t }))}
            placeholder="e.g. North London, M25 within 20 miles"
            placeholderTextColor={palette.inkMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Trades you offer</Text>
          <View style={styles.chips}>
            {TRADE_CATEGORIES.map((t) => {
              const on = p.for_hire_trades.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => toggleTrade(t)} style={[styles.chip, on && { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                  <Text style={[styles.chipText, { color: on ? '#fff' : palette.inkMuted }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.certNote}>Your certificates and insurances show on your profile from Team &amp; rates. A complete, cert-backed profile gets you hired more.</Text>

        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: typography.size.md, fontWeight: typography.weightBold as '700', color: palette.ink },
  cardSub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  label: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600', color: palette.inkSoft, marginBottom: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.md, paddingHorizontal: 10 },
  poundSign: { color: palette.inkMuted, fontSize: typography.size.md },
  rateInput: { width: 80, paddingVertical: 10, paddingHorizontal: 6, fontSize: typography.size.md, color: palette.ink },
  unitBtn: { borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  unitText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
  hint: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 6 },
  input: { borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: typography.size.sm, color: palette.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: palette.hairline, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  chipText: { fontSize: typography.size.xs, fontWeight: typography.weightSemibold as '600' },
  certNote: { fontSize: typography.size.xs, color: palette.inkMuted, marginVertical: spacing.md, lineHeight: 18 },
  saveBtn: { backgroundColor: palette.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: typography.weightBold as '700', fontSize: typography.size.md },
});
