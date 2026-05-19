import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProjectStage, StageStatus } from '@br/shared';
import { spacing, typography, formatDate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { supabase } from '../lib/supabase';
import { StagePill } from './stage-pill';

interface Props {
  stage: ProjectStage;
  isLast: boolean;
  canWrite: boolean;
  onChanged: () => void;
}

const STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Mark as complete' },
  { value: 'delayed', label: 'Flag as delayed' },
];

export function StageRow({ stage, isLast, canWrite, onChanged }: Props) {
  const { palette } = useTenant();
  const [updating, setUpdating] = useState(false);

  async function updateTo(next: StageStatus) {
    if (next === stage.status) return;
    setUpdating(true);
    const payload: {
      status: StageStatus;
      actual_end_date: string | null;
    } = {
      status: next,
      actual_end_date:
        next === 'complete' ? new Date().toISOString().slice(0, 10) : null,
    };
    const { error } = await supabase
      .from('project_stages')
      .update(payload)
      .eq('id', stage.id);
    setUpdating(false);
    if (error) {
      Alert.alert('Could not update stage', error.message);
      return;
    }
    onChanged();
  }

  function openActionSheet() {
    const labels = STATUS_OPTIONS.map((o) =>
      o.value === stage.status ? `${o.label} (current)` : o.label,
    );
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
          title: stage.name,
        },
        (idx) => {
          if (idx < labels.length) {
            updateTo(STATUS_OPTIONS[idx].value);
          }
        },
      );
    } else {
      // Android: use Alert with buttons (max 3 — so we use the long-press
      // pattern of opening a fragment-style dialog).
      Alert.alert(
        stage.name,
        'Set status',
        [
          ...STATUS_OPTIONS.map((o) => ({
            text:
              o.value === stage.status
                ? `${o.label} (current)`
                : o.label,
            onPress: () => updateTo(o.value),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  }

  const dotColour =
    stage.status === 'complete'
      ? palette.primary
      : stage.status === 'in_progress'
        ? palette.accent
        : palette.card;
  const dotBorder =
    stage.status === 'complete' || stage.status === 'in_progress'
      ? 'transparent'
      : palette.hairline;

  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <View
          style={[
            styles.dot,
            { backgroundColor: dotColour, borderColor: dotBorder },
          ]}
        >
          {stage.status === 'complete' && (
            <Ionicons name="checkmark" size={12} color="#fff" />
          )}
        </View>
        {!isLast && (
          <View
            style={[styles.connector, { backgroundColor: palette.hairline }]}
          />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: palette.ink }]}>
            {stage.position}. {stage.name}
          </Text>
          <StagePill status={stage.status} />
        </View>
        <Text style={[styles.dates, { color: palette.inkMuted }]}>
          {formatDate(stage.start_date, { short: true })} →{' '}
          {formatDate(
            stage.actual_end_date ?? stage.target_end_date,
            { short: true },
          )}
          {stage.actual_end_date && ' · actual'}
        </Text>
        {stage.pm_commentary && (
          <Text style={[styles.commentary, { color: palette.inkMuted }]}>
            {stage.pm_commentary}
          </Text>
        )}

        {canWrite && (
          <TouchableOpacity
            onPress={openActionSheet}
            disabled={updating}
            style={[
              styles.actionButton,
              { borderColor: palette.hairline, backgroundColor: palette.card },
            ]}
            activeOpacity={0.6}
          >
            {updating ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <>
                <Text style={[styles.actionText, { color: palette.primary }]}>
                  Change status
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={palette.primary}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  gutter: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  body: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  dates: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  commentary: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    marginRight: 4,
  },
});
