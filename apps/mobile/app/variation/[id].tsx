import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  formatDate,
  gbp,
} from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import {
  getVariation,
  decideVariation,
  type VariationDetail,
} from '../../lib/variations';

export default function VariationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role, palette, user_id } = useTenant();
  const { refresh: refreshProject } = useCurrentProject();

  const [variation, setVariation] = useState<VariationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const v = await getVariation(id);
    setVariation(v);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !variation) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const isClient = role === 'client';
  const isProposed = variation.status === 'proposed';
  const isAccepted = variation.status === 'accepted';
  const canDecide = isClient && isProposed;

  const isCredit = variation.delta_amount_gbp_pence < 0;
  const amount = gbp(Math.abs(variation.delta_amount_gbp_pence));
  const amountSign = isCredit ? '−' : '+';
  const amountColour = isCredit ? palette.success : palette.accentDeep;

  async function onAccept() {
    if (!variation || !user_id) return;
    if (!signature.trim()) {
      Alert.alert(
        'Sign first',
        'Type your full name in the signature box to sign off this variation.',
      );
      return;
    }
    setSubmitting(true);
    try {
      await decideVariation({
        variation_id: variation.id,
        outcome: 'accepted',
        client_signature: signature.trim(),
        decided_by: user_id,
      });
      await refreshProject();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not sign',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onReject() {
    if (!variation || !user_id) return;
    Alert.alert(
      'Reject this variation?',
      'Your PM will see this and can come back to you with a revised proposal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await decideVariation({
                variation_id: variation.id,
                outcome: 'rejected',
                client_signature: null,
                decided_by: user_id,
              });
              await refreshProject();
              router.back();
            } catch (err) {
              Alert.alert(
                'Could not reject',
                err instanceof Error ? err.message : 'Unknown error',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
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
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          {variation.number}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: canDecide ? 120 : spacing.xxl }}>
          {/* STATUS BANNER */}
          <View style={styles.statusSection}>
            {isProposed && (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.infoSoft },
                ]}
              >
                <Text style={[styles.statusLabel, { color: palette.info }]}>
                  Awaiting client signature
                </Text>
              </View>
            )}
            {isAccepted && (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.successSoft },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={palette.success}
                />
                <Text style={[styles.statusLabel, { color: palette.success }]}>
                  Accepted{variation.decided_at && ` · ${formatDate(variation.decided_at)}`}
                </Text>
              </View>
            )}
            {variation.status === 'rejected' && (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: '#EDF0F2' },
                ]}
              >
                <Text style={[styles.statusLabel, { color: palette.inkMuted }]}>
                  Rejected
                  {variation.decided_at && ` · ${formatDate(variation.decided_at)}`}
                </Text>
              </View>
            )}

            <Text style={[styles.title, { color: palette.ink }]}>
              {variation.title}
            </Text>

            {variation.description && (
              <Text style={[styles.description, { color: palette.inkMuted }]}>
                {variation.description}
              </Text>
            )}
          </View>

          {/* DELTA CARDS */}
          <View style={styles.deltaGrid}>
            <View
              style={[
                styles.deltaCard,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <Text style={[styles.deltaLabel, { color: palette.inkMuted }]}>
                Project value change
              </Text>
              <Text
                style={[styles.deltaValue, { color: amountColour }]}
              >
                {amountSign}{amount}
              </Text>
              <Text style={[styles.deltaHint, { color: palette.inkMuted }]}>
                {isCredit
                  ? 'Reduces the project value (credit)'
                  : 'Adds to the project value'}
              </Text>
            </View>
            <View
              style={[
                styles.deltaCard,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <Text style={[styles.deltaLabel, { color: palette.inkMuted }]}>
                Timeline impact
              </Text>
              <Text
                style={[
                  styles.deltaValue,
                  {
                    color:
                      variation.delta_days > 0
                        ? palette.warning
                        : variation.delta_days < 0
                          ? palette.success
                          : palette.ink,
                  },
                ]}
              >
                {variation.delta_days === 0
                  ? '0'
                  : `${variation.delta_days > 0 ? '+' : ''}${variation.delta_days}`}{' '}
                day{Math.abs(variation.delta_days) === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.deltaHint, { color: palette.inkMuted }]}>
                {variation.delta_days === 0
                  ? 'No impact on completion date'
                  : variation.delta_days > 0
                    ? 'Extends estimated completion'
                    : 'Brings completion forward'}
              </Text>
            </View>
          </View>

          {/* SIGNATURE AUDIT (if accepted) */}
          {isAccepted && variation.client_signature && (
            <View
              style={[
                styles.signatureBox,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.success,
                },
              ]}
            >
              <Text style={[styles.signatureLabel, { color: palette.inkMuted }]}>
                Signed by client
              </Text>
              <Text style={[styles.signatureName, { color: palette.ink }]}>
                {variation.client_signature}
              </Text>
              {variation.decided_at && (
                <Text style={[styles.signatureMeta, { color: palette.inkMuted }]}>
                  {formatDate(variation.decided_at)} ·{' '}
                  {new Date(variation.decided_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
          )}

          <Text style={[styles.proposer, { color: palette.inkMuted }]}>
            Proposed by{' '}
            <Text style={{ color: palette.ink, fontWeight: typography.weightBold as '700' }}>
              {variation.proposed_by_profile.full_name}
            </Text>{' '}
            on {formatDate(variation.created_at)}
          </Text>

          {/* CLIENT SIGNATURE INPUT (if can decide) */}
          {canDecide && (
            <View style={styles.signSection}>
              <Text style={[styles.signTitle, { color: palette.ink }]}>
                Sign to accept
              </Text>
              <Text style={[styles.signHint, { color: palette.inkMuted }]}>
                By typing your full name below you confirm you agree to this
                variation. This is a timestamped audit record both you and your
                builder can rely on.
              </Text>
              <TextInput
                value={signature}
                onChangeText={setSignature}
                placeholder="Type your full name"
                placeholderTextColor={palette.inkMuted}
                autoCapitalize="words"
                style={[
                  styles.signInput,
                  {
                    borderColor: palette.primary,
                    color: palette.ink,
                    backgroundColor: palette.card,
                  },
                ]}
              />
            </View>
          )}

          {/* Non-client read-only hint */}
          {!isClient && isProposed && (
            <Text style={[styles.readOnlyHint, { color: palette.inkMuted }]}>
              Only the project&apos;s client can sign this off. You can cancel or
              edit it from the web admin while it&apos;s still pending.
            </Text>
          )}
        </ScrollView>

        {canDecide && (
          <View
            style={[
              styles.footer,
              { backgroundColor: palette.card, borderTopColor: palette.hairline },
            ]}
          >
            <TouchableOpacity
              onPress={onReject}
              disabled={submitting}
              style={styles.rejectBtn}
            >
              <Text style={[styles.rejectText, { color: palette.inkMuted }]}>
                Reject
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAccept}
              disabled={submitting || !signature.trim()}
              activeOpacity={0.8}
              style={[
                styles.acceptBtn,
                {
                  backgroundColor:
                    submitting || !signature.trim()
                      ? palette.inkMuted
                      : palette.primary,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptText}>
                  {signature.trim() ? 'Sign & accept' : 'Type your name above'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 1,
  },
  statusSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  description: {
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  deltaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  deltaCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  deltaLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  deltaValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  deltaHint: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  signatureBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  signatureName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  signatureMeta: {
    fontSize: typography.size.xs,
    marginTop: 6,
  },
  proposer: {
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.xs,
    marginTop: spacing.lg,
  },
  signSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  signTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
    marginBottom: 4,
  },
  signHint: {
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  signInput: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.lg,
    fontStyle: 'italic',
  },
  readOnlyHint: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  rejectBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rejectText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
