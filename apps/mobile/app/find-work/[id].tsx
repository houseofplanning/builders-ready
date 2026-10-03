import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, typography, radius, budgetLabel, relativeTime } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getJobRequest,
  getMyBid,
  submitBid,
  openThreadForJob,
  type JobDetail,
  type BidRow,
} from '../../lib/marketplace';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant, role, user_id, palette } = useTenant();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [myBid, setMyBid] = useState<BidRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !tenant) return;
    const [j, b] = await Promise.all([getJobRequest(id), getMyBid(id, tenant.id)]);
    setJob(j);
    setMyBid(b);
    setLoading(false);
  }, [id, tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBid() {
    if (!job || !tenant || !user_id) return;
    setError(null);
    setSubmitting(true);
    try {
      const raw = amount.replace(/[£,]/g, '').trim();
      const pence = raw ? Math.round(Number(raw) * 100) : undefined;
      await submitBid({
        job_request_id: job.id,
        tenant_id: tenant.id,
        created_by: user_id,
        amount_pence: pence && Number.isFinite(pence) && pence > 0 ? pence : null,
        message: message.trim() || null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit bid.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onMessage() {
    if (!job || !tenant) return;
    try {
      const threadId = await openThreadForJob({
        job_request_id: job.id,
        tenant_id: tenant.id,
        customer_id: job.customer_id,
      });
      router.push(`/mkt-thread/${threadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the conversation.');
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }
  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>Job not found.</Text>
      </View>
    );
  }

  const canBid = (role === 'owner' || role === 'pm') && job.status === 'open' && !myBid;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
          {job.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.tag, { color: '#fff', backgroundColor: palette.primary }]}>
          {job.trade_category.toUpperCase()}
        </Text>
        <Text style={[styles.loc, { color: palette.inkMuted }]}>
          A homeowner · {[job.city, job.postcode].filter(Boolean).join(' · ')} ·{' '}
          {relativeTime(job.created_at)}
        </Text>

        <View style={[styles.statRow]}>
          <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.hairline }]}>
            <Text style={[styles.statLabel, { color: palette.inkMuted }]}>BUDGET</Text>
            <Text style={[styles.statVal, { color: palette.ink }]}>
              {budgetLabel(job.budget_min_pence, job.budget_max_pence, job.budget_note)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.hairline }]}>
            <Text style={[styles.statLabel, { color: palette.inkMuted }]}>STATUS</Text>
            <Text style={[styles.statVal, { color: palette.ink }]}>
              {job.status === 'open' ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        {job.description ? (
          <Text style={[styles.desc, { color: palette.ink }]}>{job.description}</Text>
        ) : null}

        <TouchableOpacity
          onPress={onMessage}
          activeOpacity={0.7}
          style={[styles.msgBtn, { borderColor: palette.primary }]}
        >
          <Text style={[styles.msgBtnText, { color: palette.primary }]}>Message the customer</Text>
        </TouchableOpacity>

        {myBid ? (
          <View style={[styles.bidCard, { backgroundColor: palette.card, borderColor: palette.hairline }]}>
            <Text style={[styles.bidHead, { color: palette.ink }]}>Your bid</Text>
            <Text style={[styles.loc, { color: palette.inkMuted }]}>
              {myBid.amount_pence ? budgetLabel(myBid.amount_pence, myBid.amount_pence) : 'Quote sent'}{' '}
              · {myBid.status}
            </Text>
            {myBid.message ? (
              <Text style={[styles.desc, { color: palette.ink }]}>{myBid.message}</Text>
            ) : null}
          </View>
        ) : canBid ? (
          <View style={[styles.bidCard, { backgroundColor: palette.card, borderColor: palette.hairline }]}>
            <Text style={[styles.bidHead, { color: palette.ink }]}>Submit your bid</Text>
            <Text style={[styles.hint, { color: palette.inkMuted }]}>
              Included in your subscription — no per-lead fee.
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Your price, e.g. 2500"
              keyboardType="numeric"
              placeholderTextColor={palette.inkMuted}
              style={[styles.input, { borderColor: palette.hairline, color: palette.ink }]}
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Introduce yourself and how you'd approach it."
              multiline
              placeholderTextColor={palette.inkMuted}
              style={[styles.input, styles.multiline, { borderColor: palette.hairline, color: palette.ink }]}
            />
            {error ? <Text style={[styles.err, { color: palette.error }]}>{error}</Text> : null}
            <TouchableOpacity
              onPress={onBid}
              disabled={submitting}
              style={[styles.submit, { backgroundColor: palette.primary, opacity: submitting ? 0.6 : 1 }]}
            >
              <Text style={styles.submitText}>{submitting ? 'Sending…' : 'Submit bid'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.loc, { color: palette.inkMuted, marginTop: spacing.lg }]}>
            This job is no longer accepting bids.
          </Text>
        )}
        {error && !canBid ? <Text style={[styles.err, { color: palette.error }]}>{error}</Text> : null}
      </ScrollView>
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
  title: { flex: 1, fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  loc: { fontSize: typography.size.sm, marginTop: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statCard: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  statLabel: { fontSize: 10, fontWeight: typography.weightBold as '700', letterSpacing: 0.6 },
  statVal: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', marginTop: 4 },
  desc: { fontSize: typography.size.body, marginTop: spacing.md, lineHeight: 21 },
  msgBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  msgBtnText: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  bidCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  bidHead: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800' },
  hint: { fontSize: typography.size.xs, marginTop: 2, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
    marginTop: spacing.sm,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  err: { fontSize: typography.size.xs, marginTop: spacing.sm },
  submit: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: spacing.md },
  submitText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
