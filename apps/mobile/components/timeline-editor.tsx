import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProjectStage } from '@br/shared';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { saveProjectStages } from '../lib/stages';

interface EditRow {
  key: string;
  id: string | null;
  name: string;
  start_date: string;
  target_end_date: string;
}

let seq = 0;
const newKey = () => `s${(seq += 1)}`;
const dateVal = (d: string | null) => (d ? String(d).slice(0, 10) : '');

/** YYYY-MM-DD or empty. Keeps the app's plain-text date convention. */
function dateLooksValid(d: string): boolean {
  if (!d) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

interface Props {
  projectId: string;
  stages: ProjectStage[];
  onDone: () => void;
  onCancel: () => void;
}

export function TimelineEditor({ projectId, stages, onDone, onCancel }: Props) {
  const { palette } = useTenant();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EditRow[]>(() =>
    stages.map((s) => ({
      key: newKey(),
      id: s.id,
      name: s.name,
      start_date: dateVal(s.start_date),
      target_end_date: dateVal(s.target_end_date),
    })),
  );

  function patch(key: string, p: Partial<EditRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }
  function add() {
    setRows((prev) => [
      ...prev,
      { key: newKey(), id: null, name: '', start_date: '', target_end_date: '' },
    ]);
  }

  async function onSave() {
    const cleaned = rows.filter((r) => r.name.trim());
    if (cleaned.length === 0) {
      Alert.alert('Add at least one stage');
      return;
    }
    for (const r of cleaned) {
      if (!dateLooksValid(r.start_date) || !dateLooksValid(r.target_end_date)) {
        Alert.alert('Check the dates', `Use YYYY-MM-DD (e.g. 2026-03-01) for "${r.name.trim()}".`);
        return;
      }
    }
    setSaving(true);
    const res = await saveProjectStages(
      projectId,
      cleaned.map((r) => ({
        id: r.id,
        name: r.name.trim(),
        start_date: r.start_date || null,
        target_end_date: r.target_end_date || null,
      })),
    );
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Could not save the timeline', res.error ?? 'Please try again.');
      return;
    }
    onDone();
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: palette.inkMuted }]}>
        Add, remove, reorder or re-date stages to match how the job runs — e.g. line them up
        with your payment milestones. Renaming keeps each stage’s status.
      </Text>

      {rows.map((r, i) => (
        <View
          key={r.key}
          style={[styles.card, { backgroundColor: palette.card, borderColor: palette.hairline }]}
        >
          <View style={styles.cardHead}>
            <Text style={[styles.pos, { color: palette.inkMuted }]}>{i + 1}.</Text>
            <TextInput
              value={r.name}
              onChangeText={(t) => patch(r.key, { name: t })}
              placeholder="Stage name"
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.nameInput,
                { color: palette.ink, borderColor: palette.hairline, backgroundColor: palette.canvas },
              ]}
            />
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: palette.inkMuted }]}>Start</Text>
              <TextInput
                value={r.start_date}
                onChangeText={(t) => patch(r.key, { start_date: t })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.inkMuted}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.dateInput,
                  { color: palette.ink, borderColor: palette.hairline, backgroundColor: palette.canvas },
                ]}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: palette.inkMuted }]}>End</Text>
              <TextInput
                value={r.target_end_date}
                onChangeText={(t) => patch(r.key, { target_end_date: t })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.inkMuted}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                style={[
                  styles.dateInput,
                  { color: palette.ink, borderColor: palette.hairline, backgroundColor: palette.canvas },
                ]}
              />
            </View>
          </View>

          <View style={styles.toolRow}>
            <TouchableOpacity
              onPress={() => move(i, -1)}
              disabled={i === 0}
              style={[styles.toolBtn, { borderColor: palette.hairline, opacity: i === 0 ? 0.3 : 1 }]}
              accessibilityLabel="Move up"
            >
              <Ionicons name="arrow-up" size={16} color={palette.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => move(i, 1)}
              disabled={i === rows.length - 1}
              style={[
                styles.toolBtn,
                { borderColor: palette.hairline, opacity: i === rows.length - 1 ? 0.3 : 1 },
              ]}
              accessibilityLabel="Move down"
            >
              <Ionicons name="arrow-down" size={16} color={palette.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => remove(r.key)}
              disabled={rows.length <= 1}
              style={[
                styles.toolBtn,
                { borderColor: palette.hairline, opacity: rows.length <= 1 ? 0.3 : 1 },
              ]}
              accessibilityLabel="Remove stage"
            >
              <Ionicons name="trash-outline" size={16} color={palette.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        onPress={add}
        style={[styles.addBtn, { borderColor: palette.primary }]}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color={palette.primary} />
        <Text style={[styles.addText, { color: palette.primary }]}>Add stage</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          style={[styles.cancelBtn, { borderColor: palette.hairline }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: palette.ink }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: palette.primary, opacity: saving ? 0.6 : 1 }]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save timeline</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
  },
  hint: {
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pos: {
    fontSize: typography.size.sm,
    width: 22,
    fontWeight: typography.weightSemibold as '600',
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: typography.size.body,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: typography.size.xs,
    marginBottom: 2,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: typography.size.sm,
  },
  toolRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toolBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: spacing.xs,
    gap: 4,
  },
  addText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
