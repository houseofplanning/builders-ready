import { View, Text, StyleSheet } from 'react-native';
import { relativeTime, spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { PhotoGrid } from './photo-grid';

interface UpdateCardData {
  id: string;
  headline: string | null;
  body: string;
  decision_needed: string | null;
  posted_at: string;
  posted_by_name: string;
  stage_name: string;
  photos: Array<{
    id: string;
    storage_path: string;
    width: number;
    height: number;
  }>;
}

export function UpdateCard({ update }: { update: UpdateCardData }) {
  const { palette } = useTenant();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.hairline },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.poster, { color: palette.ink }]}>
          {update.posted_by_name}
        </Text>
        <Text style={[styles.meta, { color: palette.inkMuted }]}>
          {' · '}
          {update.stage_name}
          {' · '}
          {relativeTime(update.posted_at)}
        </Text>
      </View>

      {update.headline && (
        <Text style={[styles.headline, { color: palette.ink }]}>
          {update.headline}
        </Text>
      )}

      <Text style={[styles.body, { color: palette.ink }]}>{update.body}</Text>

      {update.photos.length > 0 && <PhotoGrid photos={update.photos} />}

      {update.decision_needed && (
        <View
          style={[
            styles.decisionBox,
            {
              backgroundColor: palette.accentSoft,
              borderColor: palette.accent,
            },
          ]}
        >
          <Text
            style={[styles.decisionLabel, { color: palette.accentDeep }]}
          >
            Decision needed
          </Text>
          <Text style={[styles.decisionBody, { color: palette.ink }]}>
            {update.decision_needed}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  poster: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
  },
  meta: {
    fontSize: typography.size.sm,
  },
  headline: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    marginTop: spacing.xs,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  decisionBox: {
    marginTop: spacing.md,
    borderLeftWidth: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  decisionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  decisionBody: {
    fontSize: typography.size.sm,
    marginTop: 2,
    lineHeight: 20,
  },
});
