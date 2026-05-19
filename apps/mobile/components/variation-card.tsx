import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, gbp, formatDate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import type { VariationListItem } from '../lib/variations';

interface Props {
  variation: VariationListItem;
  onPress: () => void;
}

const STATUS_STYLES = {
  proposed: { label: 'Proposed', tone: 'info' as const },
  accepted: { label: 'Accepted', tone: 'success' as const },
  rejected: { label: 'Rejected', tone: 'muted' as const },
  cancelled: { label: 'Cancelled', tone: 'muted' as const },
};

export function VariationCard({ variation, onPress }: Props) {
  const { palette } = useTenant();
  const style = STATUS_STYLES[variation.status];
  const statusColours =
    style.tone === 'info'
      ? { bg: palette.infoSoft, fg: palette.info }
      : style.tone === 'success'
        ? { bg: palette.successSoft, fg: palette.success }
        : { bg: '#EDF0F2', fg: palette.inkMuted };

  const isCredit = variation.delta_amount_gbp_pence < 0;
  const amount = gbp(Math.abs(variation.delta_amount_gbp_pence));
  const amountSign = isCredit ? '−' : '+';
  const amountColour = isCredit ? palette.success : palette.accentDeep;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.hairline },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.number, { color: palette.inkMuted }]}>
          {variation.number}
        </Text>
        <View
          style={[styles.statusPill, { backgroundColor: statusColours.bg }]}
        >
          <Text style={[styles.statusText, { color: statusColours.fg }]}>
            {style.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>
        {variation.title}
      </Text>

      {variation.description && (
        <Text
          style={[styles.description, { color: palette.inkMuted }]}
          numberOfLines={2}
        >
          {variation.description}
        </Text>
      )}

      <View style={styles.deltaRow}>
        <View style={styles.deltaItem}>
          <Text
            style={[styles.deltaValue, { color: amountColour }]}
          >
            {amountSign}{amount}
          </Text>
          <Text style={[styles.deltaLabel, { color: palette.inkMuted }]}>
            value
          </Text>
        </View>
        {variation.delta_days !== 0 && (
          <View style={styles.deltaItem}>
            <Text
              style={[
                styles.deltaValue,
                {
                  color:
                    variation.delta_days > 0 ? palette.warning : palette.success,
                },
              ]}
            >
              {variation.delta_days > 0 ? '+' : ''}
              {variation.delta_days} day{Math.abs(variation.delta_days) === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.deltaLabel, { color: palette.inkMuted }]}>
              timeline
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.footer, { color: palette.inkMuted }]}>
        Proposed by {variation.proposed_by_name} ·{' '}
        {formatDate(variation.created_at, { short: true })}
        {variation.status === 'accepted' && variation.decided_at && variation.decided_by_name && (
          <Text>
            {'  ·  '}signed by {variation.decided_by_name}{' '}
            {formatDate(variation.decided_at, { short: true })}
          </Text>
        )}
      </Text>

      {variation.status === 'proposed' && (
        <View style={styles.chevronRow}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.inkMuted}
          />
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  number: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 1,
    fontFamily: 'ui-monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    lineHeight: 22,
  },
  description: {
    fontSize: typography.size.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  deltaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  deltaItem: {
    alignItems: 'flex-start',
  },
  deltaValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.3,
  },
  deltaLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginTop: 2,
  },
  footer: {
    fontSize: typography.size.xs,
    marginTop: spacing.md,
  },
  chevronRow: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
  },
});
