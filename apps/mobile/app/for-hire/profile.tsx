import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';
import { palette, spacing, typography, radius, TRADE_CATEGORIES, DOCUMENT_TYPES, certStatus } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getForHireProfile, saveForHireProfile, type ForHireProfile,
  listTenantDocs, addTenantDoc, deleteTenantDoc, uploadCertFile, getCertSignedUrl, type TenantDoc,
} from '../../lib/for-hire';
import { compressImage } from '../../lib/upload-photo';
import { ProfileToggle } from '../../components/profile-toggle';

const CERT_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  valid: { bg: '#D1FAE5', fg: '#065F46' },
  expiring: { bg: '#FEF3C7', fg: '#92400E' },
  expired: { bg: '#FEE2E2', fg: '#991B1B' },
  none: { bg: palette.canvas, fg: palette.inkMuted },
};

export default function ForHireProfileScreen() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<ForHireProfile>({ discoverable: false, day_rate_pence: null, day_rate_unit: 'day', for_hire_trades: [], service_area: null });
  const [rate, setRate] = useState('');
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [certType, setCertType] = useState<string>(DOCUMENT_TYPES[0]);
  const [certExpiry, setCertExpiry] = useState('');
  const [certBusy, setCertBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) { setLoading(false); return; }
    try {
      const [prof, d] = await Promise.all([getForHireProfile(tenant.id), listTenantDocs(tenant.id)]);
      setP(prof);
      setRate(prof.day_rate_pence != null ? String(Math.round(prof.day_rate_pence / 100)) : '');
      setDocs(d);
    } catch { /* retry */ } finally { setLoading(false); }
  }, [tenant]);

  async function addCert(withFile: 'photo' | 'pdf' | 'none') {
    if (!tenant) return;
    setCertBusy(true);
    try {
      let filePath: string | null = null;
      if (withFile === 'photo') {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (res.canceled) { setCertBusy(false); return; }
        const asset = await compressImage(res.assets[0]!.uri);
        filePath = await uploadCertFile(tenant.id, asset.uri, 'image/jpeg', 'jpg');
      } else if (withFile === 'pdf') {
        const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
        if (res.canceled) { setCertBusy(false); return; }
        filePath = await uploadCertFile(tenant.id, res.assets[0]!.uri, 'application/pdf', 'pdf');
      }
      await addTenantDoc({ tenant_id: tenant.id, doc_type: certType, reference: null, expires_on: certExpiry.trim() || null, file_path: filePath });
      setCertExpiry(''); setAdding(false);
      await load();
    } catch (e) {
      Alert.alert('Could not add certificate', e instanceof Error ? e.message : 'Try again.');
    } finally { setCertBusy(false); }
  }

  async function removeCert(d: TenantDoc) {
    try { await deleteTenantDoc(d.id, d.file_path); setDocs((prev) => prev.filter((x) => x.id !== d.id)); } catch { /* ignore */ }
  }

  async function viewCert(d: TenantDoc) {
    if (!d.file_path) return;
    const url = await getCertSignedUrl(d.file_path);
    if (url) Linking.openURL(url);
  }
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

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Certificates &amp; insurances</Text>
            <TouchableOpacity onPress={() => setAdding((v) => !v)}>
              <Text style={styles.addLink}>{adding ? 'Cancel' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Upload your cards, insurances and certificates. A complete, cert-backed profile gets you hired more.</Text>

          {adding && (
            <View style={styles.addCert}>
              <View style={styles.chips}>
                {DOCUMENT_TYPES.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setCertType(t)} style={[styles.chip, certType === t && { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                    <Text style={[styles.chipText, { color: certType === t ? '#fff' : palette.inkMuted }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={certExpiry} onChangeText={setCertExpiry} placeholder="Expiry date (YYYY-MM-DD, optional)" placeholderTextColor={palette.inkMuted} style={[styles.input, { marginTop: 8 }]} />
              <View style={styles.certBtns}>
                <TouchableOpacity disabled={certBusy} onPress={() => addCert('photo')} style={styles.certBtn}>
                  <Ionicons name="camera-outline" size={16} color={palette.primary} /><Text style={styles.certBtnText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={certBusy} onPress={() => addCert('pdf')} style={styles.certBtn}>
                  <Ionicons name="document-outline" size={16} color={palette.primary} /><Text style={styles.certBtnText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={certBusy} onPress={() => addCert('none')} style={[styles.certBtn, { borderColor: palette.hairline }]}>
                  <Text style={[styles.certBtnText, { color: palette.inkMuted }]}>{certBusy ? 'Saving…' : 'No file'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {docs.length === 0 ? (
            <Text style={[styles.hint, { marginTop: 8 }]}>No certificates added yet.</Text>
          ) : (
            docs.map((d) => {
              const st = certStatus(d.expires_on);
              const c = CERT_STATUS_COLOR[st] ?? CERT_STATUS_COLOR.none!;
              return (
                <View key={d.id} style={styles.certRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certName}>{d.doc_type}</Text>
                    {d.expires_on ? <Text style={styles.certMeta}>Expires {d.expires_on}</Text> : null}
                  </View>
                  <View style={[styles.certChip, { backgroundColor: c.bg }]}>
                    <Text style={[styles.certChipText, { color: c.fg }]}>{st === 'none' ? 'No expiry' : st}</Text>
                  </View>
                  {d.file_path ? (
                    <TouchableOpacity onPress={() => viewCert(d)} hitSlop={8}><Ionicons name="eye-outline" size={20} color={palette.primary} /></TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => removeCert(d)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={palette.inkMuted} /></TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

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
  addLink: { color: palette.primary, fontWeight: typography.weightBold as '700', fontSize: typography.size.sm },
  addCert: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.hairline, paddingTop: spacing.sm },
  certBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: palette.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  certBtnText: { color: palette.primary, fontWeight: typography.weightSemibold as '600', fontSize: typography.size.sm },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.hairline },
  certName: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700', color: palette.ink },
  certMeta: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  certChip: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  certChipText: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700', textTransform: 'capitalize' },
  saveBtn: { backgroundColor: palette.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: typography.weightBold as '700', fontSize: typography.size.md },
});
