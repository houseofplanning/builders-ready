import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  palette,
  spacing,
  typography,
  radius,
  budgetLabel,
  jobRequestStatusLabel,
  relativeTime,
  type JobRequestStatus,
} from '@br/shared';
import { useTenant } from '../../../lib/tenant-provider';
import {
  getMyRequestWithBids,
  acceptBid,
  declineBid,
  openThreadFromBid,
  type MyRequestDetail,
} from '../../../lib/marketplace';

export default function CustomerRequestDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user_id } = useTenant();
  const [detail, setDetail] = useState<MyRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !user_id) return;
    setDetail(await getMyRequestWithBids(id, user_id));
    setLoading(false);
  }, [id, user_id]);

  useEffect(() => {
    void load();
  }, [load]);

  function onAccept(bidId: string) {
    Alert.alert('Hire this trade?', 'This starts the job and declines the other quotes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hire',
        onPress: async () => {
          setError(null);
          setBusy(true);
          try {
            await acceptBid(bidId);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not accept.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function onDecline(bidId: string) {
    setBusy(true);
    try {
      await declineBid(bidId);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onMessage(bidId: string) {
    if (!user_id) return;
    try {
      const tid = await openThreadFromBid({ bid_id: bidId, customer_id: user_id });
      router.push(`/mkt-thread/${tid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the conversation.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }
  if (!detail) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <Text style={{ color: palette.inkMuted }}>Request not found.</Text>
      </SafeAreaView>
    );
  }

  const isOpen = detail.status === ('open' as JobRequestStatus);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.htitle} numberOfLines={1}>
          {detail.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.meta}>
          {detail.trade_category} ·{' '}
          {budgetLabel(detail.budget_min_pence, detail.budget_max_pence, detail.budget_note)} ·{' '}
          {jobRequestStatusLabel(detail.status)}
        </Text>

        {!isOpen && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {detail.status === 'matched'
                ? 'You have hired a trade. Follow the build, approve changes and pay in your project.'
                : 'This request is closed.'}
            </Text>
            {detail.status === 'matched' && detail.matched_project_id ? (
              <TouchableOpacity
                onPress={() => router.push(`/customer/project/${detail.matched_project_id}`)}
                style={styles.openProjectBtn}
              >
                <Text style={styles.openProjectText}>Open project →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.sectionTitle}>
          {detail.bids.length} {detail.bids.length === 1 ? 'quote' : 'quotes'}
        </Text>

        {detail.bids.length === 0 ? (
          <Text style={styles.empty}>No quotes yet — trades usually respond within a day or two.</Text>
        ) : (
          detail.bids.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trade}>{b.trade_name}</Text>
                  <Text style={styles.ago}>{relativeTime(b.created_at)}</Text>
                </View>
                <Text style={styles.amount}>
                  {b.amount_pence ? budgetLabel(b.amount_pence, b.amount_pence) : 'Quote'}
                </Text>
              </View>
              {b.message ? <Text style={styles.msg}>{b.message}</Text> : null}

              <View style={styles.actions}>
                {b.status === 'accepted' ? (
                  <Text style={styles.hired}>Hired</Text>
                ) : b.status === 'declined' ? (
                  <Text style={styles.declined}>Declined</Text>
                ) : isOpen ? (
                  <>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => onAccept(b.id)}
                      style={[styles.btn, { backgroundColor: palette.primary }]}
                    >
                      <Text style={styles.btnSolidText}>Accept &amp; hire</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => onDecline(b.id)}
                      style={[styles.btn, styles.btnOutline]}
                    >
                      <Text style={styles.btnOutlineText}>Decline</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.declined}>Not selected</Text>
                )}
                <TouchableOpacity onPress={() => onMessage(b.id)} style={[styles.btn, styles.btnOutline]}>
                  <Text style={styles.btnOutlineText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  meta: { fontSize: typography.size.sm, color: palette.inkMuted },
  banner: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#A7E3CC',
    backgroundColor: '#E8F7F0',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: { fontSize: typography.size.sm, color: '#0F6E56' },
  openProjectBtn: {
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 9,
    alignItems: 'center',
  },
  openProjectText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  error: { color: palette.error, fontSize: typography.size.sm, marginTop: spacing.md },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  empty: { fontSize: typography.size.sm, color: palette.inkMuted },
  card: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: palette.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  trade: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  ago: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  amount: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  msg: { fontSize: typography.size.body, color: palette.ink, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md, alignItems: 'center' },
  btn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 9 },
  btnOutline: { borderWidth: 1, borderColor: palette.hairline },
  btnSolidText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  btnOutlineText: { color: palette.ink, fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  hired: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
    color: '#0F6E56',
    backgroundColor: '#E8F7F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  declined: { fontSize: typography.size.sm, color: palette.inkMuted, fontWeight: typography.weightSemibold as '600' },
});
