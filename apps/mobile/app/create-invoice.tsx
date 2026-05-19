import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, typography, radius, gbp } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { createInvoice } from '../lib/invoices';

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
  const [submitting, setSubmitting] = useState(false);

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
      });
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

          <Text style={[styles.label, { color: palette.inkMuted }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Stage 3 payment — structure complete"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              {
                borderColor: palette.hairline,
                backgroundColor: palette.card,
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
              placeholder="0.00"
              placeholderTextColor={palette.inkMuted}
              keyboardType="decimal-pad"
              style={[
                styles.field,
                styles.amountField,
                {
                  borderColor: palette.hairline,
                  backgroundColor: palette.card,
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
