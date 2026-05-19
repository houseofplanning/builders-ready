import { Text, StyleSheet, View } from 'react-native';
import type { StageStatus } from '@br/shared';
import { typography } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';

const STAGE_LABELS: Record<StageStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  delayed: 'Delayed',
};

export function StagePill({ status }: { status: StageStatus }) {
  const { palette } = useTenant();
  const bg = {
    not_started: '#EDF0F2',
    in_progress: palette.infoSoft,
    complete: palette.successSoft,
    delayed: palette.errorSoft,
  }[status];
  const fg = {
    not_started: palette.inkMuted,
    in_progress: palette.info,
    complete: palette.success,
    delayed: palette.error,
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{STAGE_LABELS[status]}</Text>
    </View>
  );
}

const PROJECT_LABELS = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function ProjectStatusPill({
  status,
}: {
  status: 'active' | 'on_hold' | 'completed' | 'archived';
}) {
  const { palette } = useTenant();
  const bg = {
    active: palette.successSoft,
    on_hold: palette.warningSoft,
    completed: '#EDF0F2',
    archived: '#EDF0F2',
  }[status];
  const fg = {
    active: palette.success,
    on_hold: palette.warning,
    completed: palette.inkMuted,
    archived: palette.inkMuted,
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>
        {PROJECT_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
