import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, typography, radius, gbp } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { createInvoice, raiseMilestoneInvoice } from '../lib/invoices';
import { getContract, type ContractMilestone } from '../lib/contracts';

function parsePenceText(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[£,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DUE_PRESETS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dueDays, setDueDays] = useState<number>(14);
  const [allowCard, setAllowCard] = useState(true);
  const [allowBank, setAllowBank] = useState(true);
  const [allowCash, setAllowCash] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Unbilled contract milestones for this project — the builder can raise an
  // invoice straight off the agreed schedule (web parity).
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const projectId = current?.project.id;
  useEffect(() => {
    let cancelled = false;
    if (!projectId) return;
    getContract(projectId)
      .then((c) => {
        if (cancelled || !c) return;
        setMilestones(c.milestones.filter((m) => !m.invoice_id && m.amount_resolved_pence > 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!current || !tenant || !user_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.center}>
          <Text>No project selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const amountPence = parsePenceText(amountText);
  const validAmount = amountPence !== null;

  const bankWarning =
    !tenant.bank_account_name ||
    !tenant.bank_sort_code ||
    !tenant.bank_account_number;

  function selectMilestone(m: ContractMilestone | null) {
    setSelectedMilestoneId(m?.id ?? null);
    if (m) {
      setTitle(m.name);
      setAmountText((m.amount_resolved_pence / 100).toFixed(2));
      setDescription('');
    } else {
      setTitle('');
      setAmountText('');
    }
  }

  async function onSubmit() {
    if (!title.trim()) {
      Alert.alert('Add a title', 'What is this invoice for?');
      return;
    }
    if (!validAmount) {
      Alert.alert('Enter a £ amount');
      return;
    }
    setSubmitting(true);
    try {
      if (selectedMilestoneId) {
        // Raise straight off the contract schedule — amount comes from the
        // contract and the invoice is linked back to the milestone.
        await raiseMilestoneInvoice(selectedMilestoneId, user_id!, {
          allow_card: allowCard,
          allow_bank_transfer: allowBank,
          allow_cash: allowCash,
        });
      } else {
        await createInvoice({
          tenant_id: tenant!.id,
          project_id: current!.project.id,
          created_by: user_id!,
          title: title.trim(),
          description: description.trim() || null,
          amount_gbp_pence: amountPence!,
          issued_at: todayISO(),
          due_at: daysFromNowISO(dueDays),
          number_override: null,
          allow_card: allowCard,
          allow_bank_transfer: allowBank,
          allow_cash: allowCash,
        });
      }
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not create invoice',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <Text style={[styles.cancelText, { color: palette.inkMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>New invoice</Text>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting || !title.trim() || !validAmount}
          hitSlop={10}
        >
          {submitting ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Text
              style={[
                styles.postText,
                {
                  color:
                    title.trim() && validAmount
                      ? palette.primary
                      : palette.inkMuted,
                },
              ]}
            >
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {bankWarning && (
            <View
              style={[
                styles.warningBox,
                { backgroundColor: palette.warningSoft, borderColor: palette.warning },
              ]}
            >
              <Text
                style={[styles.warningText, { color: palette.ink }]}
              >
                Bank details aren&apos;t filled in for{' '}
                <Text style={{ fontWeight: typography.weightBold as '700' }}>
                  {tenant.name}
                </Text>
                . Your client won&apos;t see how to pay this until you add them
                in the web admin. The invoice will still send.
              </Text>
            </View>
          )}

          {milestones.length > 0 && (
            <>
              <Text style={[styles.label, { color: palette.inkMuted }]}>
                From your contract
              </Text>
              <View
                style={[
                  styles.methodCard,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                {milestones.map((m, i) => {
                  const active = selectedMilestoneId === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => selectMilestone(active ? null : m)}
                      activeOpacity={0.7}
                      style={[
                        styles.methodRow,
                        i > 0 && styles.methodRowBorder,
                        i > 0 && { borderTopColor: palette.hairline },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.methodLabel, { color: palette.ink }]}>
                          {m.name}
                          {m.is_retention ? '  · retention' : ''}
                        </Text>
                        <Text style={[styles.methodHint, { color: palette.inkMuted }]}>
                          {m.percent != null ? `${m.percent}% of contract` : 'Fixed amount'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.methodLabel,
                          { color: active ? palette.primary : palette.ink, marginRight: spacing.sm },
                        ]}
                      >
                        {gbp(m.amount_resolved_pence)}
                      </Text>
                      <View
                        style={[
                          styles.radio,
                          { borderColor: active ? palette.primary : palette.hairline },
                          active && { backgroundColor: palette.primary },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: palette.inkMuted }]}>
                {selectedMilestoneId
                  ? 'Billing this milestone — the amount is set by the contract. Deselect it to raise a custom invoice.'
                  : 'Pick a milestone to bill it, or just fill in a custom invoice below.'}
              </Text>
            </>
          )}

          <Text style={[styles.label, { color: palette.inkMuted }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!selectedMilestoneId}
            placeholder="e.g. Stage 3 payment — structure complete"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              {
                borderColor: palette.hairline,
                backgroundColor: selectedMilestoneId ? palette.canvas : palette.card,
                color: palette.ink,
              },
            ]}
          />

          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder="Line-item breakdown or context for the client"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              styles.textarea,
              {
                borderColor: palette.hairline,
                backgroundColor: palette.card,
                color: palette.ink,
              },
            ]}
          />

          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Amount
          </Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amountCurrency, { color: palette.inkMuted }]}>
              £
            </Text>
            <TextInput
              value={amountText}
              onChangeText={(t) => setAmountText(t.replace(/[^0-9.,]/g, ''))}
              editable={!selectedMilestoneId}
              placeholder="0.00"
              placeholderTextColor={palette.inkMuted}
              keyboardType="decimal-pad"
              style={[
                styles.field,
                styles.amountField,
                {
                  borderColor: palette.hairline,
                  backgroundColor: selectedMilestoneId ? palette.canvas : palette.card,
                  color: palette.ink,
                },
              ]}
            />
          </View>

          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Payment terms
          </Text>
          <View style={styles.segments}>
            {DUE_PRESETS.map((p) => {
              const active = dueDays === p.days;
              return (
                <TouchableOpacity
                  key={p.days}
                  onPress={() => setDueDays(p.days)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : palette.ink },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: palette.inkMuted }]}>
            Due {daysFromNowISO(dueDays)}.
          </Text>

          <Text style={[styles.label, { color: palette.inkMuted }]}>
            How can the client pay?
          </Text>
          <View
            style={[
              styles.methodCard,
              { backgroundColor: palette.card, borderColor: palette.hairline },
            ]}
          >
            <View style={styles.methodRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodLabel, { color: palette.ink }]}>
                  Card
                </Text>
                <Text style={[styles.methodHint, { color: palette.inkMuted }]}>
                  {tenant.connect_charges_enabled
                    ? 'Pay instantly by card'
                    : 'Shows once you connect Stripe'}
                </Text>
              </View>
              <Switch
                value={allowCard}
                onValueChange={setAllowCard}
                trackColor={{ true: palette.primary }}
              />
            </View>
            <View style={[styles.methodRow, styles.methodRowBorder, { borderTopColor: palette.hairline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodLabel, { color: palette.ink }]}>
                  Bank transfer
                </Text>
                <Text style={[styles.methodHint, { color: palette.inkMuted }]}>
                  Client sees your bank details, then flags it paid
                </Text>
              </View>
              <Switch
                value={allowBank}
                onValueChange={setAllowBank}
                trackColor={{ true: palette.primary }}
              />
            </View>
            <View style={[styles.methodRow, styles.methodRowBorder, { borderTopColor: palette.hairline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodLabel, { color: palette.ink }]}>
                  Cash
                </Text>
                <Text style={[styles.methodHint, { color: palette.inkMuted }]}>
                  Client flags cash; you confirm when received
                </Text>
              </View>
              <Switch
                value={allowCash}
                onValueChange={setAllowCash}
                trackColor={{ true: palette.primary }}
              />
            </View>
          </View>

          {/* PREVIEW */}
          <View
            style={[
              styles.preview,
              { backgroundColor: palette.primarySoft, borderColor: palette.primary },
            ]}
          >
            <Text style={[styles.previewLabel, { color: palette.inkMuted }]}>
              The client will see
            </Text>
            <Text style={[styles.previewTitle, { color: palette.ink }]}>
              {title.trim() || 'Your invoice title…'}
            </Text>
            <Text style={[styles.previewAmount, { color: palette.ink }]}>
              {validAmount ? gbp(amountPence!) : '£0.00'}
            </Text>
            <Text style={[styles.previewMeta, { color: palette.inkMuted }]}>
              Number auto-generated as INV-{new Date().getFullYear()}-NNN
              {'  ·  '}
              Due {daysFromNowISO(dueDays)}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  postText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountCurrency: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightBold as '700',
  },
  amountField: {
    flex: 1,
  },
  segments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  hint: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  methodRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  methodLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  methodHint: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  preview: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  previewAmount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  previewMeta: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
});
