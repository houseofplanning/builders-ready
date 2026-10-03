import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, spacing, typography, radius, gbp, relativeTime, formatDate } from '@br/shared';
import { useTenant } from '../../../lib/tenant-provider';
import {
  getCustomerProject,
  listProjectStages,
  listProjectUpdates,
  listProjectInvoices,
  listOpenDecisions,
  listProposedVariations,
  decideDecision,
  signVariation,
  payInvoice,
  type ProjectHeader,
  type Stage,
  type Update,
  type Invoice,
  type OpenDecision,
  type ProposedVariation,
} from '../../../lib/marketplace';

const STAGE_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  delayed: 'Delayed',
};

export default function CustomerProject() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user_id } = useTenant();
  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [decisions, setDecisions] = useState<OpenDecision[]>([]);
  const [variations, setVariations] = useState<ProposedVariation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, s, u, inv, d, v] = await Promise.all([
      getCustomerProject(id),
      listProjectStages(id),
      listProjectUpdates(id),
      listProjectInvoices(id),
      listOpenDecisions(id),
      listProposedVariations(id),
    ]);
    setProject(p);
    setStages(s);
    setUpdates(u);
    setInvoices(inv);
    setDecisions(d);
    setVariations(v);
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
  if (!project) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <Text style={{ color: palette.inkMuted }}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  const unpaid = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.htitle} numberOfLines={1}>
          {project.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.meta}>
          {project.trade_name} · est. {formatDate(project.estimated_end_date)}
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressVal}>{project.progress_percent}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, project.progress_percent))}%` }]} />
          </View>
        </View>

        {(decisions.length > 0 || variations.length > 0 || unpaid.length > 0) && (
          <>
            <Text style={styles.section}>Needs you</Text>
            {decisions.map((d) => (
              <DecisionCard key={d.id} d={d} userId={user_id ?? ''} onDone={load} />
            ))}
            {variations.map((v) => (
              <VariationCard key={v.id} v={v} userId={user_id ?? ''} onDone={load} />
            ))}
            {unpaid.map((i) => (
              <InvoiceRow key={i.id} i={i} pay />
            ))}
          </>
        )}

        <Text style={styles.section}>Timeline</Text>
        {stages.map((s) => (
          <View key={s.id} style={styles.lineRow}>
            <Text style={styles.lineName}>{s.name}</Text>
            <Text style={styles.lineStatus}>{STAGE_LABEL[s.status] ?? s.status}</Text>
          </View>
        ))}

        <Text style={styles.section}>Updates</Text>
        {updates.length === 0 ? (
          <Text style={styles.muted}>No updates yet.</Text>
        ) : (
          updates.map((u) => (
            <View key={u.id} style={styles.card}>
              {u.headline ? <Text style={styles.cardTitle}>{u.headline}</Text> : null}
              <Text style={styles.cardBody}>{u.body}</Text>
              <Text style={styles.muted}>{relativeTime(u.posted_at)}</Text>
            </View>
          ))
        )}

        {invoices.length > 0 && (
          <>
            <Text style={styles.section}>Payments</Text>
            {invoices.map((i) => (
              <InvoiceRow key={i.id} i={i} pay={i.status === 'sent' || i.status === 'overdue'} />
            ))}
          </>
        )}

        {project.status === 'completed' && (
          <TouchableOpacity
            onPress={() => router.push(`/customer/review/${project.id}`)}
            style={styles.reviewBtn}
          >
            <Text style={styles.reviewBtnText}>Leave a review</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DecisionCard({ d, userId, onDone }: { d: OpenDecision; userId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function choose(optionId: string) {
    setBusy(true);
    try {
      await decideDecision(d.id, optionId, userId);
      onDone();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Decision: {d.title}</Text>
      {d.description ? <Text style={styles.cardBody}>{d.description}</Text> : null}
      {d.options.map((o) => (
        <TouchableOpacity
          key={o.id}
          disabled={busy}
          onPress={() => choose(o.id)}
          style={styles.optionBtn}
        >
          <Text style={styles.optionText}>
            Choose: {o.label}
            {o.price_gbp_pence ? ` — ${gbp(o.price_gbp_pence)}` : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function VariationCard({ v, userId, onDone }: { v: ProposedVariation; userId: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  async function sign() {
    setBusy(true);
    try {
      await signVariation(v.id, name, userId);
      onDone();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not sign.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        Variation {v.number}: {v.title}
      </Text>
      {v.description ? <Text style={styles.cardBody}>{v.description}</Text> : null}
      <Text style={styles.deltaText}>
        {v.delta_amount_gbp_pence >= 0 ? '+' : ''}
        {gbp(v.delta_amount_gbp_pence)} · {v.delta_days >= 0 ? '+' : ''}
        {v.delta_days} days
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Type your name to approve"
        placeholderTextColor={palette.inkMuted}
        style={styles.input}
      />
      <TouchableOpacity disabled={busy} onPress={sign} style={styles.solidBtn}>
        <Text style={styles.solidBtnText}>Approve &amp; sign</Text>
      </TouchableOpacity>
    </View>
  );
}

function InvoiceRow({ i, pay }: { i: Invoice; pay: boolean }) {
  const [busy, setBusy] = useState(false);
  async function onPay() {
    setBusy(true);
    try {
      const url = await payInvoice(i.id);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not start payment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <View style={styles.invRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {i.number} — {i.title}
          </Text>
          <Text style={styles.muted}>
            {gbp(i.amount_gbp_pence)}
            {pay ? ` · due ${formatDate(i.due_at)}` : ''}
          </Text>
        </View>
        {i.status === 'paid' ? (
          <Text style={styles.paid}>Paid</Text>
        ) : pay ? (
          <TouchableOpacity disabled={busy} onPress={onPay} style={styles.payBtn}>
            <Text style={styles.payBtnText}>{busy ? '…' : 'Pay now'}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.muted}>{i.status}</Text>
        )}
      </View>
    </View>
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
  progressCard: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: palette.card,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700', color: palette.ink },
  progressVal: { fontSize: typography.size.sm, fontWeight: typography.weightExtraBold as '800', color: palette.primary },
  track: { height: 10, borderRadius: 999, backgroundColor: palette.canvas, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 999, backgroundColor: palette.primary },
  section: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: palette.card,
  },
  cardTitle: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  cardBody: { fontSize: typography.size.body, color: palette.ink, marginTop: 4 },
  muted: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 4 },
  deltaText: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700', color: palette.ink, marginTop: 6 },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    marginBottom: 6,
    backgroundColor: palette.card,
  },
  lineName: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600', color: palette.ink },
  lineStatus: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700', color: palette.inkMuted },
  optionBtn: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  optionText: { color: palette.primary, fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: typography.size.body,
    color: palette.ink,
    marginTop: spacing.sm,
  },
  solidBtn: { backgroundColor: palette.primary, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', marginTop: spacing.sm },
  solidBtnText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  invRow: { flexDirection: 'row', alignItems: 'center' },
  payBtn: { backgroundColor: palette.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 9 },
  payBtnText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  paid: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    color: '#0F6E56',
    backgroundColor: '#E8F7F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  reviewBtn: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  reviewBtnText: { color: palette.primary, fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
