import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, gbp, formatDate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import type { DecisionListItem } from '../lib/decisions';

interface Props {
  decision: DecisionListItem;
  onPress: () => void;
  chosenOptionLabel?: string | null;
}

export type UrgencyTone = 'overdue' | 'today' | 'soon' | 'comfortable' | null;

export function urgencyOf(deadline: string | null): {
  tone: UrgencyTone;
  label: string;
  daysLeft: number | null;
} {
  if (!deadline) return { tone: null, label: '', daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (days < 0) return { tone: 'overdue', label: 'Overdue', daysLeft: days };
  if (days === 0) return { tone: 'today', label: 'Due today', daysLeft: 0 };
  if (days === 1) return { tone: 'today', label: 'Due tomorrow', daysLeft: 1 };
  if (days <= 3) return { tone: 'soon', label: `${days} days left`, daysLeft: days };
  return { tone: 'comfortable', label: `${days} days left`, daysLeft: days };
}

export function DecisionCard({ decision, onPress, chosenOptionLabel }: Props) {
  const { palette } = useTenant();
  const urgency = urgencyOf(decision.deadline);
  const isOpen = decision.status === 'open';

  const urgencyColours =
    urgency.tone === 'overdue' || urgency.tone === 'today'
      ? { bg: palette.errorSoft, fg: palette.error }
      : urgency.tone === 'soon'
        ? { bg: palette.warningSoft, fg: palette.warning }
        : { bg: palette.infoSoft, fg: palette.info };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: isOpen && urgency.tone === 'overdue'
            ? palette.error
            : palette.hairline,
          borderLeftWidth: isOpen && urgency.tone === 'overdue' ? 4 : 1,
          opacity: isOpen ? 1 : 0.85,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {isOpen && urgency.tone && (
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
              </Text>
            </View>
          )}
          {!isOpen && (
            <View style={styles.statusRow}>
              <Ionicons
                name={
                  decision.status === 'accepted'
                    ? 'checkmark-circle'
                    : 'close-circle'
                }
                size={14}
                color={
                  decision.status === 'accepted'
                    ? palette.success
                    : palette.inkMuted
                }
              />
              <Text style={[styles.statusLabel, { color: palette.inkMuted }]}>
                {decision.status === 'accepted' ? 'Accepted' : 'Rejected'} ·{' '}
                {decision.decided_at
                  ? formatDate(decision.decided_at, { short: true })
                  : '—'}
                {decision.decided_by_name &&
                  ` by ${decision.decided_by_name}`}
              </Text>
            </View>
          )}

          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>
            {decision.title}
          </Text>

          {decision.description && isOpen && (
            <Text
              style={[styles.description, { color: palette.inkMuted }]}
              numberOfLines={2}
            >
              {decision.description}
            </Text>
          )}

          {chosenOptionLabel && (
            <Text
              style={[styles.chosenLine, { color: palette.ink }]}
              numberOfLines={1}
            >
              Chose <Text style={{ fontWeight: typography.weightBold as '700' }}>
                {chosenOptionLabel}
              </Text>
            </Text>
          )}

          <Text style={[styles.meta, { color: palette.inkMuted }]}>
            {decision.option_count} option{decision.option_count === 1 ? '' : 's'}
            {decision.cheapest_pence !== null &&
              decision.dearest_pence !== null &&
              decision.cheapest_pence !== decision.dearest_pence &&
              `  ·  ${gbp(decision.cheapest_pence, { whole: true })}–${gbp(decision.dearest_pence, { whole: true })}`}
            {decision.cheapest_pence !== null &&
              decision.dearest_pence !== null &&
              decision.cheapest_pence === decision.dearest_pence &&
              `  ·  ${gbp(decision.cheapest_pence, { whole: true })}`}
            {'  ·  '}
            Raised by {decision.raised_by_name}
          </Text>
        </View>
        {isOpen && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.inkMuted}
            style={{ marginLeft: spacing.sm }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  urgencyPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  urgencyLabel: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  statusLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    lineHeight: 22,
  },
  description: {
    fontSize: typography.size.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  chosenLine: {
    fontSize: typography.size.sm,
    marginTop: 4,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
});
