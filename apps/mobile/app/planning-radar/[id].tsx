import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getPlanningListing,
  getListingStage,
  setListingStage,
  statusBadge,
  STAGE_LABELS,
  workCategoryToTemplateKey,
  splitAddress,
  type PlanningListing,
  type PlanningStage,
} from '../../lib/planning-radar';
import { setPendingTemplateQuote } from '../../lib/quote-templates';

const ACTION_STAGES: PlanningStage[] = ['saved', 'approached', 'replied', 'won'];

function prettyDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PlanningListingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant, user_id, palette } = useTenant();

  const [listing, setListing] = useState<PlanningListing | null>(null);
  const [stage, setStage] = useState<PlanningStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const l = await getPlanningListing(id);
      setListing(l);
      if (l && tenant) setStage(await getListingStage(l.id, tenant.id));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyStage(next: PlanningStage) {
    if (!listing || !tenant || !user_id) return;
    setSaving(true);
    const prev = stage;
    setStage(next); // optimistic
    try {
      await setListingStage({
        listingId: listing.id,
        tenantId: tenant.id,
        userId: user_id,
        stage: next,
      });
    } catch {
      setStage(prev);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    Alert.alert('Not interested?', 'This will hide the job from your pipeline.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: async () => {
          await applyStage('not_interested');
          router.back();
        },
      },
    ]);
  }

  function startQuote() {
    if (!listing) return;
    const { line1, postcode } = splitAddress(listing.address, listing.postcode);
    setPendingTemplateQuote({
      title: `${listing.work_category ?? 'Planning job'} — ${line1}`,
      projectType: workCategoryToTemplateKey(listing.work_category),
      lines: [],
      pricedOn: null,
      siteAddressLine1: line1,
      city: null,
      postcode,
      note:
        'Started from Planning Radar — site address and job type are filled in. Pick your template, add your prices, then add the client when you have them.',
    });
    router.push('/create-estimate');
  }

  async function openMaps() {
    if (!listing) return;
    const q =
      listing.latitude != null && listing.longitude != null
        ? `${listing.latitude},${listing.longitude}`
        : encodeURIComponent(listing.address);
    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const ok = await Linking.canOpenURL(url);
    if (ok) void Linking.openURL(url);
  }

  async function openPortal() {
    if (!listing?.portal_url) return;
    const ok = await Linking.canOpenURL(listing.portal_url);
    if (ok) void Linking.openURL(listing.portal_url);
    else Alert.alert('Could not open', 'The council record link is unavailable.');
  }

  const b = listing ? statusBadge(listing.status) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Planning job</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : error || !listing ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={palette.inkMuted} />
          <Text style={[styles.muted, { color: palette.inkMuted }]}>Couldn&apos;t load this job.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.topRow}>
            <Text style={[styles.chip, { color: palette.primary, backgroundColor: palette.card, borderColor: palette.hairline }]}>
              {listing.work_category ?? 'Planning'}
            </Text>
            {b && <Text style={[styles.badge, { color: b.fg, backgroundColor: b.bg }]}>{b.label}</Text>}
          </View>

          <Text style={[styles.addr, { color: palette.ink }]}>{listing.address}</Text>
          <Text style={[styles.meta, { color: palette.inkMuted }]}>
            {[listing.postcode, listing.authority].filter(Boolean).join(' · ')}
          </Text>

          {/* Description */}
          <View style={[styles.block, { backgroundColor: palette.card, borderColor: palette.hairline }]}>
            <Text style={[styles.blockLabel, { color: palette.inkMuted }]}>THE WORK</Text>
            <Text style={[styles.desc, { color: palette.ink }]}>
              {listing.description || 'No description provided in the planning record.'}
            </Text>
            <View style={styles.factRow}>
              {!!listing.application_type && (
                <Text style={[styles.fact, { color: palette.inkMuted }]}>
                  Type: {listing.application_type}
                </Text>
              )}
              {!!listing.validated_date && (
                <Text style={[styles.fact, { color: palette.inkMuted }]}>
                  Submitted {prettyDate(listing.validated_date)}
                </Text>
              )}
              {!!listing.decided_date && (
                <Text style={[styles.fact, { color: palette.inkMuted }]}>
                  Decided {prettyDate(listing.decided_date)}
                </Text>
              )}
            </View>
          </View>

          {/* Approach guidance */}
          <View style={[styles.approach, { backgroundColor: palette.canvas, borderColor: palette.hairline }]}>
            <Ionicons name="mail-outline" size={18} color={palette.primary} />
            <Text style={[styles.approachText, { color: palette.ink }]}>
              Pop a letter through the door or knock and introduce yourself. The
              homeowner here is planning work you do.
            </Text>
          </View>

          {/* Create a quote from the matching template */}
          <TouchableOpacity
            onPress={startQuote}
            activeOpacity={0.85}
            style={[styles.quoteBtn, { backgroundColor: palette.primary }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.quoteBtnText}>Create a quote for this job</Text>
          </TouchableOpacity>

          {/* Draft a letter */}
          <TouchableOpacity
            onPress={() => router.push(`/planning-radar/letter?id=${encodeURIComponent(listing.id)}`)}
            activeOpacity={0.85}
            style={[styles.ghostBtn, { borderColor: palette.hairline, backgroundColor: palette.card }]}
          >
            <Ionicons name="mail-outline" size={18} color={palette.primary} />
            <Text style={[styles.ghostBtnText, { color: palette.ink }]}>Draft a letter to post</Text>
          </TouchableOpacity>

          {/* Open in Maps */}
          {(listing.latitude != null || !!listing.address) && (
            <TouchableOpacity
              onPress={openMaps}
              activeOpacity={0.85}
              style={[styles.ghostBtn, { borderColor: palette.hairline, backgroundColor: palette.card }]}
            >
              <Ionicons name="map-outline" size={18} color={palette.primary} />
              <Text style={[styles.ghostBtnText, { color: palette.ink }]}>Open in Maps &amp; get directions</Text>
            </TouchableOpacity>
          )}

          {/* Official record */}
          {!!listing.portal_url && (
            <TouchableOpacity
              onPress={openPortal}
              activeOpacity={0.85}
              style={[styles.ghostBtn, { borderColor: palette.hairline, backgroundColor: palette.card }]}
            >
              <Ionicons name="open-outline" size={18} color={palette.primary} />
              <Text style={[styles.ghostBtnText, { color: palette.ink }]}>View official record</Text>
            </TouchableOpacity>
          )}

          {/* Pipeline stage */}
          <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>TRACK THIS JOB</Text>
          <View style={styles.stageRow}>
            {ACTION_STAGES.map((s) => {
              const active = stage === s;
              return (
                <TouchableOpacity
                  key={s}
                  disabled={saving}
                  onPress={() => void applyStage(s)}
                  activeOpacity={0.85}
                  style={[
                    styles.stageBtn,
                    { borderColor: palette.hairline, backgroundColor: palette.card },
                    active && { backgroundColor: palette.primary, borderColor: palette.primary },
                  ]}
                >
                  <Text style={[styles.stageBtnText, { color: active ? '#fff' : palette.ink }]}>
                    {STAGE_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={styles.dismiss}>
            <Text style={[styles.dismissText, { color: palette.inkMuted }]}>Not interested — hide this</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    fontSize: 12,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  badge: {
    fontSize: 11,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  addr: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800', marginTop: spacing.md },
  meta: { fontSize: typography.size.sm, marginTop: 4 },
  muted: { fontSize: typography.size.sm },
  block: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  blockLabel: { fontSize: 11, fontWeight: typography.weightBold as '700', letterSpacing: 1, marginBottom: 8 },
  desc: { fontSize: typography.size.body, lineHeight: 22 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  fact: { fontSize: typography.size.xs },
  approach: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  approachText: { flex: 1, fontSize: typography.size.sm, lineHeight: 20 },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  quoteBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  ghostBtnText: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600' },
  sectionLabel: { fontSize: 11, fontWeight: typography.weightBold as '700', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  stageBtnText: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  dismiss: { alignItems: 'center', marginTop: spacing.xl },
  dismissText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
});
