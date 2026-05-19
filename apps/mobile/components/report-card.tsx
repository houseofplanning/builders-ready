import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, formatDate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import type { ReportListItem } from '../lib/reports';

export function ReportCard({
  report,
  onPress,
}: {
  report: ReportListItem;
  onPress: () => void;
}) {
  const { palette } = useTenant();
  const ack = !!report.acknowledged_at;

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
        <View
          style={[
            styles.kindPill,
            {
              backgroundColor:
                report.kind === 'pdf' ? palette.infoSoft : palette.primarySoft,
            },
          ]}
        >
          <Ionicons
            name={report.kind === 'pdf' ? 'document-attach-outline' : 'reader-outline'}
            size={12}
            color={report.kind === 'pdf' ? palette.info : palette.primary}
          />
          <Text
            style={[
              styles.kindText,
              {
                color:
                  report.kind === 'pdf' ? palette.info : palette.primary,
              },
            ]}
          >
            {report.kind === 'pdf' ? 'PDF' : 'Report'}
          </Text>
        </View>
        {ack ? (
          <View
            style={[styles.ackPill, { backgroundColor: palette.successSoft }]}
          >
            <Ionicons name="checkmark-circle" size={12} color={palette.success} />
            <Text style={[styles.ackText, { color: palette.success }]}>
              Read
            </Text>
          </View>
        ) : (
          <View
            style={[styles.ackPill, { backgroundColor: palette.accentSoft }]}
          >
            <Text style={[styles.ackText, { color: palette.accentDeep }]}>
              New
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>
        {report.title}
      </Text>

      {report.summary_preview && (
        <Text
          style={[styles.summary, { color: palette.inkMuted }]}
          numberOfLines={2}
        >
          {report.summary_preview}
        </Text>
      )}

      <Text style={[styles.meta, { color: palette.inkMuted }]}>
        {report.posted_by_name} · {formatDate(report.posted_at, { short: true })}
        {ack &&
          report.acknowledged_at &&
          report.acknowledged_by_name &&
          `  ·  ack'd by ${report.acknowledged_by_name} ${formatDate(report.acknowledged_at, { short: true })}`}
      </Text>
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
    marginBottom: spacing.sm,
  },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kindText: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ackText: {
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
  summary: {
    fontSize: typography.size.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: spacing.sm,
  },
});
