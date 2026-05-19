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
import { proposeVariation } from '../lib/variations';

function parsePenceText(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[£,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export default function ProposeVariationScreen() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [daysText, setDaysText] = useState('');
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
  const daysNum = daysText.trim() ? parseInt(daysText.trim(), 10) : 0;
  const validAmount =
    amountPence !== null && amountPence > 0 && Number.isFinite(amountPence);
  const validDays = !daysText.trim() || Number.isFinite(daysNum);

  async function onSubmit() {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Summarise what the change is in one line.');
      return;
    }
    if (!validAmount) {
      Alert.alert('Enter a £ amount', 'How much does this change the project value?');
      return;
    }
    if (!validDays) {
      Alert.alert('Days must be a whole number', 'Or leave blank for 0.');
      return;
    }
    setSubmitting(true);
    try {
      await proposeVariation({
        tenant_id: tenant!.id,
        project_id: current!.project.id,
        proposed_by: user_id!,
        title: title.trim(),
        description: description.trim() || null,
        delta_amount_gbp_pence: isCredit ? -amountPence! : amountPence!,
        delta_days: Number.isFinite(daysNum) ? daysNum : 0,
      });
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not propose variation',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const previewLabel = validAmount
    ? `${isCredit ? '−' : '+'}${gbp(amountPence!)}`
    : '+£0.00';

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
        <Text style={[styles.title, { color: palette.ink }]}>
          Propose variation
        </Text>
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
          <Text style={[styles.label, { color: palette.inkMuted }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Upgrade bathroom tiles to large-format porcelain"
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
            Detail for the client
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Explain the change and why you're proposing it. Be specific — the client signs this off."
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
            Project value change
          </Text>
          <View style={styles.creditToggle}>
            <TouchableOpacity
              onPress={() => setIsCredit(false)}
              style={[
                styles.creditOption,
                {
                  backgroundColor: !isCredit ? palette.accent : palette.card,
                  borderColor: !isCredit ? palette.accent : palette.hairline,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.creditOptionText,
                  { color: !isCredit ? '#fff' : palette.ink },
                ]}
              >
                + Extra cost
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsCredit(true)}
              style={[
                styles.creditOption,
                {
                  backgroundColor: isCredit ? palette.success : palette.card,
                  borderColor: isCredit ? palette.success : palette.hairline,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.creditOptionText,
                  { color: isCredit ? '#fff' : palette.ink },
                ]}
              >
                − Credit / refund
              </Text>
            </TouchableOpacity>
          </View>
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
            Timeline impact (days)
          </Text>
          <TextInput
            value={daysText}
            onChangeText={(t) => setDaysText(t.replace(/[^0-9-]/g, ''))}
            placeholder="0 (leave blank if no change)"
            placeholderTextColor={palette.inkMuted}
            keyboardType="numbers-and-punctuation"
            style={[
              styles.field,
              {
                borderColor: palette.hairline,
                backgroundColor: palette.card,
                color: palette.ink,
              },
            ]}
          />
          <Text style={[styles.hint, { color: palette.inkMuted }]}>
            Positive number extends the project (e.g. +5). Negative brings it forward
            (e.g. -2). Zero or blank if no impact.
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
              {title.trim() || 'Your variation title…'}
            </Text>
            <Text
              style={[
                styles.previewAmount,
                {
                  color: isCredit ? palette.success : palette.accentDeep,
                },
              ]}
            >
              {previewLabel}
              {Number.isFinite(daysNum) && daysNum !== 0 && (
                <Text style={[styles.previewDays, { color: palette.inkMuted }]}>
                  {'  ·  '}
                  {daysNum > 0 ? '+' : ''}
                  {daysNum} day{Math.abs(daysNum) === 1 ? '' : 's'}
                </Text>
              )}
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
    minHeight: 96,
    textAlignVertical: 'top',
  },
  creditToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  creditOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  creditOptionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
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
  hint: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
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
  previewDays: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
    letterSpacing: 0,
  },
});
