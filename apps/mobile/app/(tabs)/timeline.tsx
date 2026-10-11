import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import { ProjectPickerButton } from '../../components/project-picker-button';
import { StageRow } from '../../components/stage-row';
import { TimelineEditor } from '../../components/timeline-editor';

export default function TimelineTab() {
  const { role, palette } = useTenant();
  const { current, loading, refresh } = useCurrentProject();
  const canWrite = role === 'owner' || role === 'pm';
  const [editing, setEditing] = useState(false);

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: palette.canvas }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          editing ? undefined : (
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          )
        }
      >
        <ProjectPickerButton />

        <View style={styles.headerRow}>
          <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
            {current.stages.filter((s) => s.status === 'complete').length} of{' '}
            {current.stages.length} stages complete
          </Text>
          {canWrite && !editing && (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={[styles.editBtn, { borderColor: palette.hairline }]}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color={palette.ink} />
              <Text style={[styles.editText, { color: palette.ink }]}>Edit timeline</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <TimelineEditor
            projectId={current.project.id}
            stages={current.stages}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              refresh();
            }}
          />
        ) : (
          <>
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
                ? 'Tap "Change status" on any stage to flip it. Marking a stage complete stamps today as the actual end date. Use "Edit timeline" to add, remove, reorder or re-date stages.'
                : 'Your PM updates these as work progresses. You’ll get a notification when a stage advances.'}
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.size.sm,
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
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
