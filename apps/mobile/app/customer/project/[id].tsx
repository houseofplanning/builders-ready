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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { palette, spacing, typography, radius, gbp, relativeTime, formatDate, offerableInvoiceMethods, type PaymentMethod } from '@br/shared';
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
  requestCashPayment,
  requestBankPayment,
  getProjectPaymentDetails,
  getHandoverUrl,
  type ProjectHeader,
  type Stage,
  type Update,
  type Invoice,
  type ProjectPaymentDetails,
  type OpenDecision,
  type ProposedVariation,
} from '../../../lib/marketplace';

const STAGE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not started', color: palette.inkMuted, bg: palette.canvas },
  in_progress: { label: 'In progress', color: palette.primary, bg: '#E7F0F2' },
  complete: { label: 'Complete', color: '#0F6E56', bg: '#E8F7F0' },
  delayed: { label: 'Delayed', color: '#B54708', bg: '#FEF0E6' },
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
  const [payInfo, setPayInfo] = useState<ProjectPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, s, u, inv, d, v, pay] = await Promise.all([
        getCustomerProject(id),
        listProjectStages(id),
        listProjectUpdates(id),
        listProjectInvoices(id),
        listOpenDecisions(id),
        listProposedVariations(id),
        getProjectPaymentDetails(id),
      ]);
      setProject(p);
      setStages(s);
      setUpdates(u);
      setInvoices(inv);
      setDecisions(d);
      setVariations(v);
      setPayInfo(pay);
    } catch {
      // Stop the spinner on failure so the screen isn't stuck; pull-to-refresh retries.
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function onMessageBuilder() {
    if (!id) return;
    // One conversation per project — both sides use the project chat.
    router.push(`/customer/project-chat/${id}`);
  }

  async function onHandover() {
    const path = project?.handover_pdf_storage_path;
    if (!path) return;
    try {
      const url = await getHandoverUrl(path);
      if (url) await Linking.openURL(url);
      else Alert.alert('Not available', 'The handover document could not be opened.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open the document.');
    }
  }

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
  const cardReady = !!payInfo?.card_ready;
  const bankReady = !!payInfo?.bank_ready;
  const methodsFor = (i: Invoice): PaymentMethod[] =>
    offerableInvoiceMethods(i, { cardReady, bankReady });

  // Money summary — agreed value, paid so far, still to pay.
  const paidPence = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount_gbp_pence || 0), 0);
  const dueNowPence = unpaid.reduce((s, i) => s + Number(i.amount_gbp_pence || 0), 0);
  const totalInvoicedPence = invoices.reduce(
    (s, i) => s + Number(i.amount_gbp_pence || 0),
    0,
  );
  const projectValuePence =
    Number(project.quoted_amount_pence ?? 0) + project.accepted_variations_pence ||
    totalInvoicedPence;
  const remainingPence = Math.max(0, projectValuePence - paidPence);
  const showMoney = projectValuePence > 0 || paidPence > 0;
  const paidPct =
    projectValuePence > 0
      ? Math.min(100, Math.round((paidPence / projectValuePence) * 100))
      : 0;

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.meta}>
          {project.trade_name} · est. {formatDate(project.estimated_end_date)}
        </Text>

        <TouchableOpacity onPress={onMessageBuilder} activeOpacity={0.8} style={styles.msgBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.primary} />
          <Text style={styles.msgBtnText}>Message your builder</Text>
        </TouchableOpacity>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressVal}>{project.progress_percent}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, project.progress_percent))}%` }]} />
          </View>
        </View>

        {showMoney && (
          <View style={styles.moneyCard}>
            <View style={styles.moneyRow}>
              <View style={styles.moneyCol}>
                <Text style={styles.moneyLabel}>Project value</Text>
                <Text style={styles.moneyVal}>{gbp(projectValuePence)}</Text>
                {project.accepted_variations_pence > 0 && (
                  <Text style={styles.moneyHint}>incl. approved changes</Text>
                )}
              </View>
              <View style={styles.moneyCol}>
                <Text style={styles.moneyLabel}>Paid so far</Text>
                <Text style={[styles.moneyVal, { color: '#0F6E56' }]}>{gbp(paidPence)}</Text>
              </View>
              <View style={styles.moneyCol}>
                <Text style={styles.moneyLabel}>Still to pay</Text>
                <Text style={styles.moneyVal}>{gbp(remainingPence)}</Text>
                {dueNowPence > 0 && (
                  <Text style={styles.moneyDue}>{gbp(dueNowPence)} due now</Text>
                )}
              </View>
            </View>
            <View style={styles.moneyTrack}>
              <View style={[styles.moneyFill, { width: `${paidPct}%` }]} />
            </View>
          </View>
        )}

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
              <InvoiceRow
                key={i.id}
                i={i}
                pay
                methods={methodsFor(i)}
                bankDetails={payInfo}
                onDone={load}
              />
            ))}
          </>
        )}

        <Text style={styles.section}>Timeline</Text>
        {stages.map((s) => {
          const st = STAGE_STYLE[s.status] ?? { label: s.status, color: palette.inkMuted, bg: palette.canvas };
          return (
            <View key={s.id} style={styles.lineRow}>
              <Text style={styles.lineName}>{s.name}</Text>
              <Text style={[styles.lineStatusPill, { color: st.color, backgroundColor: st.bg }]}>
                {st.label}
              </Text>
            </View>
          );
        })}

        <Text style={styles.section}>Updates</Text>
        {updates.length === 0 ? (
          <Text style={styles.muted}>No updates yet.</Text>
        ) : (
          updates.map((u) => (
            <View key={u.id} style={styles.card}>
              {u.headline ? <Text style={styles.cardTitle}>{u.headline}</Text> : null}
              <Text style={styles.cardBody}>{u.body}</Text>
              {u.photos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: spacing.sm }}
                >
                  {u.photos.map((url) => (
                    <Image key={url} source={{ uri: url }} style={styles.updatePhoto} />
                  ))}
                </ScrollView>
              )}
              <Text style={styles.muted}>{relativeTime(u.posted_at)}</Text>
            </View>
          ))
        )}

        {invoices.length > 0 && (
          <>
            <Text style={styles.section}>Payments</Text>
            {invoices.map((i) => (
              <InvoiceRow
                key={i.id}
                i={i}
                pay={i.status === 'sent' || i.status === 'overdue'}
                methods={methodsFor(i)}
                bankDetails={payInfo}
                onDone={load}
              />
            ))}
          </>
        )}

        {project.handover_pdf_storage_path && (
          <>
            <Text style={styles.section}>Project handover</Text>
            <TouchableOpacity onPress={onHandover} activeOpacity={0.85} style={styles.handoverBtn}>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.handoverText}>Download handover PDF</Text>
            </TouchableOpacity>
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
      </KeyboardAvoidingView>
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
    if (name.trim().length < 2) {
      Alert.alert('Type your name', 'Please type your full name to approve this change.');
      return;
    }
    setBusy(true);
    try {
      await signVariation(v.id, name.trim(), userId);
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
      <TouchableOpacity
        disabled={busy || name.trim().length < 2}
        onPress={sign}
        style={[styles.solidBtn, (busy || name.trim().length < 2) && { opacity: 0.5 }]}
      >
        <Text style={styles.solidBtnText}>Approve &amp; sign</Text>
      </TouchableOpacity>
    </View>
  );
}

function InvoiceRow({
  i,
  pay,
  methods = [],
  bankDetails,
  onDone,
}: {
  i: Invoice;
  pay: boolean;
  methods?: PaymentMethod[];
  bankDetails?: ProjectPaymentDetails | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showBank, setShowBank] = useState(false);
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
  function onCash() {
    Alert.alert(
      'Pay in cash?',
      "This lets your builder know you'll pay in cash. They'll confirm once they've received it.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'll pay in cash",
          onPress: async () => {
            setBusy(true);
            try {
              await requestCashPayment(i.id);
              onDone();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not update.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }
  async function onBankConfirm() {
    setBusy(true);
    try {
      await requestBankPayment(i.id);
      onDone();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update.');
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
        ) : !pay ? (
          <Text style={styles.muted}>{i.status}</Text>
        ) : null}
      </View>
      {i.status !== 'paid' && pay && (
        i.cash_requested_at ? (
          <Text style={styles.cashNote}>
            ✓ Cash payment flagged — waiting for your builder to confirm receipt.
          </Text>
        ) : i.bank_requested_at ? (
          <Text style={styles.cashNote}>
            ✓ Bank transfer flagged — waiting for your builder to confirm receipt.
          </Text>
        ) : methods.length === 0 ? (
          <Text style={styles.cashNote}>Your builder will confirm payment.</Text>
        ) : (
          <>
            <View style={styles.invActions}>
              {methods.includes('card') && (
                <TouchableOpacity disabled={busy} onPress={onPay} style={[styles.payBtn, { flex: 1 }]}>
                  <Text style={styles.payBtnText}>{busy ? '…' : 'Pay by card'}</Text>
                </TouchableOpacity>
              )}
              {methods.includes('bank') && (
                <TouchableOpacity
                  disabled={busy}
                  onPress={() => setShowBank((v) => !v)}
                  style={styles.cashBtn}
                >
                  <Text style={styles.cashBtnText}>Bank transfer</Text>
                </TouchableOpacity>
              )}
              {methods.includes('cash') && (
                <TouchableOpacity disabled={busy} onPress={onCash} style={styles.cashBtn}>
                  <Text style={styles.cashBtnText}>Pay in cash</Text>
                </TouchableOpacity>
              )}
            </View>
            {showBank && methods.includes('bank') && (
              <View style={styles.bankPanel}>
                <Text style={styles.bankHead}>Transfer to</Text>
                {!!bankDetails?.bank_account_name && (
                  <Text style={styles.bankLine}>Name: {bankDetails.bank_account_name}</Text>
                )}
                {!!bankDetails?.bank_name && (
                  <Text style={styles.bankLine}>Bank: {bankDetails.bank_name}</Text>
                )}
                {!!bankDetails?.bank_sort_code && (
                  <Text style={styles.bankLine}>Sort code: {bankDetails.bank_sort_code}</Text>
                )}
                {!!bankDetails?.bank_account_number && (
                  <Text style={styles.bankLine}>Account no: {bankDetails.bank_account_number}</Text>
                )}
                <Text style={styles.cashNote}>
                  Use your project name as the reference. Once you&rsquo;ve sent it, tap below.
                </Text>
                <TouchableOpacity disabled={busy} onPress={onBankConfirm} style={styles.solidBtn}>
                  <Text style={styles.solidBtnText}>{busy ? '…' : "I've paid by bank transfer"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )
      )}
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
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: spacing.md,
  },
  msgBtnText: { color: palette.primary, fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
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
  moneyCard: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: palette.card,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moneyCol: { flex: 1, paddingRight: spacing.sm },
  moneyLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moneyVal: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    marginTop: 2,
  },
  moneyHint: { fontSize: 10, color: palette.inkMuted, marginTop: 1 },
  moneyDue: { fontSize: 10, color: '#B54708', fontWeight: typography.weightBold as '700', marginTop: 1 },
  moneyTrack: { height: 6, borderRadius: 999, backgroundColor: palette.canvas, marginTop: spacing.md, overflow: 'hidden' },
  moneyFill: { height: 6, borderRadius: 999, backgroundColor: '#0F6E56' },
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
  updatePhoto: { width: 240, height: 170, borderRadius: radius.md, marginRight: spacing.sm, backgroundColor: palette.canvas },
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
  lineName: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600', color: palette.ink, flex: 1, paddingRight: spacing.sm },
  lineStatusPill: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
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
  invActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  payBtn: { backgroundColor: palette.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  cashBtn: { borderWidth: 1, borderColor: palette.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, alignItems: 'center' },
  cashBtnText: { color: palette.primary, fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  cashNote: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: spacing.sm, lineHeight: 16 },
  bankPanel: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.canvas,
  },
  bankHead: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bankLine: { fontSize: typography.size.sm, color: palette.ink, marginTop: 2 },
  handoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  handoverText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
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
