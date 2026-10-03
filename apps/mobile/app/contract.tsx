import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  gbp,
  formatDate,
  CONTRACT_STATUS_LABELS,
} from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  getContract,
  signContract,
  sendContract,
  type ProjectContract,
} from '../lib/contracts';
import { getInvoiceCheckoutUrl } from '../lib/pay';

export default function ContractScreen() {
  const router = useRouter();
  const { role, palette, user_id } = useTenant();
  const { current } = useCurrentProject();
  const projectId = current?.project.id;

  const [contract, setContract] = useState<ProjectContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signName, setSignName] = useState('');
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const canManage = role === 'owner' || role === 'pm';

  async function onPayMilestone(invoiceId: string) {
    setPayingId(invoiceId);
    try {
      const url = await getInvoiceCheckoutUrl(invoiceId);
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not start payment', err instanceof Error ? err.message : 'Error');
    } finally {
      setPayingId(null);
    }
  }

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const c = await getContract(projectId);
    setContract(c);
    setLoading(false);
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onSign() {
    if (!contract || !user_id) return;
    if (signName.trim().length < 2) {
      Alert.alert('Add your name', 'Type your full name to sign.');
      return;
    }
    Alert.alert(
      'Sign this contract?',
      `You're agreeing the scope, the sum of ${gbp(
        contract.contract_sum_pence,
      )} and the payment schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          onPress: async () => {
            setBusy(true);
            try {
              await signContract(contract.id, signName.trim(), user_id);
              await load();
            } catch (err) {
              Alert.alert('Could not sign', err instanceof Error ? err.message : 'Error');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  async function onSend() {
    if (!contract) return;
    setBusy(true);
    try {
      await sendContract(contract.id);
      await load();
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const statusColor =
    contract?.status === 'signed'
      ? palette.success
      : contract?.status === 'sent'
        ? palette.primary
        : palette.inkMuted;

  const off =
    contract && Math.abs(contract.scheduled_total_pence - contract.contract_sum_pence) > 50;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: palette.card, borderBottomColor: palette.hairline },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          Contract &amp; payments
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && !contract ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : !contract ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={40} color={palette.inkMuted} />
          <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
            {canManage
              ? 'No contract yet. Set up the contract and payment schedule from the web dashboard, then send it here for your client to sign.'
              : "Your builder hasn't shared a contract for this project yet."}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          >
            {/* STATUS + SUM */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {CONTRACT_STATUS_LABELS[contract.status]}
                </Text>
              </View>
              <Text style={[styles.sumLabel, { color: palette.inkMuted }]}>
                Contract sum
              </Text>
              <Text style={[styles.sumValue, { color: palette.ink }]}>
                {gbp(contract.contract_sum_pence)}
              </Text>
              {contract.retention_pence > 0 && (
                <Text style={[styles.retention, { color: palette.inkMuted }]}>
                  Includes {gbp(contract.retention_pence)} retention, released after
                  snagging.
                </Text>
              )}
              {off && (
                <Text style={[styles.off, { color: palette.warning }]}>
                  Schedule totals {gbp(contract.scheduled_total_pence)}.
                </Text>
              )}
            </View>

            {/* SCHEDULE */}
            <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
              Payment schedule
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.hairline, padding: 0 },
              ]}
            >
              {contract.milestones.map((m, i) => {
                const canPay =
                  contract.payments_enabled &&
                  role === 'client' &&
                  !!m.invoice_id &&
                  m.invoice_status !== 'paid';
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.msRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: palette.hairline },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.msName, { color: palette.ink }]}>
                        {m.name}
                        {m.is_retention ? '  · retention' : ''}
                      </Text>
                      <Text style={[styles.msMeta, { color: palette.inkMuted }]}>
                        {m.percent != null ? `${m.percent}% of contract` : 'Fixed amount'}
                        {m.invoice_status
                          ? m.invoice_status === 'paid'
                            ? '  ·  Paid'
                            : '  ·  Invoiced'
                          : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.msAmount, { color: palette.ink }]}>
                        {gbp(m.amount_resolved_pence)}
                      </Text>
                      {canPay && (
                        <TouchableOpacity
                          onPress={() => onPayMilestone(m.invoice_id!)}
                          disabled={payingId === m.invoice_id}
                          style={[styles.payBtn, { backgroundColor: palette.primary }]}
                        >
                          <Text style={styles.payBtnText}>
                            {payingId === m.invoice_id ? 'Opening…' : 'Pay now'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* TERMS */}
            {contract.terms ? (
              <>
                <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
                  Terms
                </Text>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: palette.card, borderColor: palette.hairline },
                  ]}
                >
                  <Text style={[styles.terms, { color: palette.ink }]}>
                    {contract.terms}
                  </Text>
                </View>
              </>
            ) : null}

            {/* SIGN / STATUS */}
            {contract.status === 'signed' ? (
              <View
                style={[
                  styles.signedBox,
                  { backgroundColor: palette.successSoft, borderColor: palette.success },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                <Text style={[styles.signedText, { color: palette.success }]}>
                  Signed{contract.client_signature ? ` by ${contract.client_signature}` : ''}
                  {contract.signed_at ? ` · ${formatDate(contract.signed_at)}` : ''}
                </Text>
              </View>
            ) : contract.status === 'sent' && role === 'client' ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                <Text style={[styles.signTitle, { color: palette.ink }]}>
                  Accept &amp; sign
                </Text>
                <Text style={[styles.signHint, { color: palette.inkMuted }]}>
                  Type your full name to agree the scope, sum and payment schedule
                  above.
                </Text>
                <TextInput
                  value={signName}
                  onChangeText={setSignName}
                  placeholder="Your full name"
                  placeholderTextColor={palette.inkMuted}
                  style={[
                    styles.input,
                    {
                      color: palette.ink,
                      borderColor: palette.hairline,
                      backgroundColor: palette.canvas,
                    },
                  ]}
                />
                <TouchableOpacity
                  onPress={onSign}
                  disabled={busy}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: palette.primary, opacity: busy ? 0.6 : 1 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? 'Signing…' : 'Sign contract'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : contract.status === 'sent' ? (
              <Text style={[styles.awaiting, { color: palette.inkMuted }]}>
                Sent to your client — awaiting their signature.
              </Text>
            ) : canManage ? (
              <TouchableOpacity
                onPress={onSend}
                disabled={busy}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: palette.primary, opacity: busy ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {busy ? 'Sending…' : 'Send to client for signature'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  emptyBody: {
    fontSize: typography.size.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: { padding: spacing.lg },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sumLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  sumValue: {
    fontSize: typography.size.display,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -1,
    marginTop: 2,
  },
  retention: { fontSize: typography.size.sm, marginTop: spacing.xs, lineHeight: 19 },
  off: { fontSize: typography.size.sm, marginTop: spacing.xs },
  sectionLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: spacing.sm,
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  msName: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  msMeta: { fontSize: typography.size.xs, marginTop: 2 },
  msAmount: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
    marginLeft: spacing.md,
  },
  payBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  payBtnText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
  },
  terms: { fontSize: typography.size.body, lineHeight: 22 },
  signedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  signedText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
    flex: 1,
  },
  signTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  signHint: {
    fontSize: typography.size.sm,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  awaiting: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
