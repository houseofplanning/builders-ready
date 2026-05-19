import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import { ProjectPickerButton } from '../../components/project-picker-button';
import { StageRow } from '../../components/stage-row';

export default function TimelineTab() {
  const { role, palette } = useTenant();
  const { current, loading, refresh } = useCurrentProject();
  const canWrite = role === 'owner' || role === 'pm';

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>
          {loading ? 'Loading project…' : 'No project selected.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <ProjectPickerButton />

      <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
        {current.stages.filter((s) => s.status === 'complete').length} of{' '}
        {current.stages.length} stages complete
      </Text>

      <View
        style={[
          styles.timeline,
          { backgroundColor: palette.card, borderColor: palette.hairline },
        ]}
      >
        {current.stages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isLast={i === current.stages.length - 1}
            canWrite={canWrite}
            onChanged={refresh}
          />
        ))}
      </View>

      <Text style={[styles.footer, { color: palette.inkMuted }]}>
        {canWrite
          ? 'Tap "Change status" on any stage to flip it. Marking a stage complete stamps today as the actual end date.'
          : 'Your PM updates these as work progresses. You’ll get a notification when a stage advances.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  subtitle: {
    fontSize: typography.size.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  timeline: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: 14,
    paddingBottom: spacing.sm,
  },
  footer: {
    fontSize: typography.size.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    lineHeight: 18,
    textAlign: 'center',
  },
});
