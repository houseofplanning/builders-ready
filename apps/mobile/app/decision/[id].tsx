import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  formatDate,
  type UUID,
} from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import {
  getDecision,
  decideDecision,
  type DecisionDetail,
} from '../../lib/decisions';
import { urgencyOf } from '../../components/decision-card';
import { OptionCard } from '../../components/option-card';

export default function DecisionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role, palette, user_id } = useTenant();
  const { refresh: refreshProject } = useCurrentProject();
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<UUID | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const isClient = role === 'client';
  const isDecided =
    decision?.status === 'accepted' || decision?.status === 'rejected';
  const readOnly = !isClient || isDecided;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const d = await getDecision(id);
    setDecision(d);
    setSelectedOptionId(d?.selected_option_id ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onAccept() {
    if (!decision || !selectedOptionId || !user_id) return;
    setSubmitting(true);
    try {
      await decideDecision({
        decision_id: decision.id,
        outcome: 'accepted',
        selected_option_id: selectedOptionId,
        decided_by: user_id,
      });
      await refreshProject();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not accept',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onRejectAll() {
    if (!decision || !user_id) return;
    Alert.alert(
      'Reject all options?',
      'Your PM will see this and can come back to you with new options.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject all',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await decideDecision({
                decision_id: decision.id,
                outcome: 'rejected',
                selected_option_id: null,
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

  if (loading || !decision) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const urgency = urgencyOf(decision.deadline);
  const urgencyColours =
    urgency.tone === 'overdue' || urgency.tone === 'today'
      ? { bg: palette.errorSoft, fg: palette.error }
      : urgency.tone === 'soon'
        ? { bg: palette.warningSoft, fg: palette.warning }
        : { bg: palette.infoSoft, fg: palette.info };

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['bottom']}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: palette.hairline,
            backgroundColor: palette.card,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          Decision
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl + 80 }}
      >
        <View style={styles.heroSection}>
          {decision.status === 'open' && urgency.tone && (
            <View
              style={[
                styles.urgencyPill,
                { backgroundColor: urgencyColours.bg },
              ]}
            >
              <Text
                style={[styles.urgencyLabel, { color: urgencyColours.fg }]}
              >
                {urgency.label}
                {decision.deadline ? ` · ${formatDate(decision.deadline)}` : ''}
              </Text>
            </View>
          )}

          {isDecided && (
            <View
              style={[
                styles.urgencyPill,
                {
                  backgroundColor:
                    decision.status === 'accepted'
                      ? palette.successSoft
                      : '#EDF0F2',
                },
              ]}
            >
              <Text
                style={[
                  styles.urgencyLabel,
                  {
                    color:
                      decision.status === 'accepted'
                        ? palette.success
                        : palette.inkMuted,
                  },
                ]}
              >
                {decision.status === 'accepted' ? 'Accepted' : 'Rejected'}
                {decision.decided_at &&
                  `  ·  ${formatDate(decision.decided_at)}`}
                {decision.decided_by_profile &&
                  `  ·  ${decision.decided_by_profile.full_name}`}
              </Text>
            </View>
          )}

          <Text style={[styles.title, { color: palette.ink }]}>
            {decision.title}
          </Text>
          {decision.description && (
            <Text style={[styles.description, { color: palette.inkMuted }]}>
              {decision.description}
            </Text>
          )}
          <Text style={[styles.raiser, { color: palette.inkMuted }]}>
            Raised by{' '}
            <Text style={{ color: palette.ink, fontWeight: typography.weightBold as '700' }}>
              {decision.raised_by_profile.full_name}
            </Text>
            {' · '}
            {formatDate(decision.created_at, { short: true })}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
          {decision.options.length} options
        </Text>

        {decision.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            selected={selectedOptionId === option.id}
            chosen={
              isDecided && decision.selected_option_id === option.id
            }
            readOnly={readOnly}
            onSelect={() => setSelectedOptionId(option.id)}
            onPreviewPhoto={setPreview}
          />
        ))}

        {readOnly && isClient && isDecided && (
          <Text style={[styles.readOnlyHint, { color: palette.inkMuted }]}>
            You decided this on{' '}
            {decision.decided_at ? formatDate(decision.decided_at) : 'a recent date'}.
            Need to change? Ask your PM to raise it again.
          </Text>
        )}
        {!isClient && (
          <Text style={[styles.readOnlyHint, { color: palette.inkMuted }]}>
            Only the project&apos;s client can accept or reject. You can edit
            the options from the web admin while it&apos;s still open.
          </Text>
        )}
      </ScrollView>

      {isClient && !isDecided && (
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: palette.card,
              borderTopColor: palette.hairline,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onRejectAll}
            disabled={submitting}
            style={styles.rejectBtn}
          >
            <Text style={[styles.rejectText, { color: palette.inkMuted }]}>
              Reject all
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAccept}
            disabled={submitting || !selectedOptionId}
            style={[
              styles.acceptBtn,
              {
                backgroundColor:
                  submitting || !selectedOptionId
                    ? palette.inkMuted
                    : palette.primary,
              },
            ]}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptText}>
                {selectedOptionId ? 'Accept selected option' : 'Pick one to accept'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Photo preview modal */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewBackdrop}>
          {preview && (
            <Image
              source={{ uri: preview }}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
          <SafeAreaView style={styles.previewClose}>
            <TouchableOpacity
              onPress={() => setPreview(null)}
              hitSlop={20}
              style={styles.previewCloseBtn}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  urgencyPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  urgencyLabel: {
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
  raiser: {
    fontSize: typography.size.xs,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  readOnlyHint: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    fontSize: typography.size.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  footerBar: {
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
  },
  previewClose: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  previewCloseBtn: {
    margin: spacing.md,
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
