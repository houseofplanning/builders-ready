import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  gbp,
  ESTIMATE_LINE_KIND_LABELS,
  ESTIMATE_LINE_KIND_DEFAULT_UNIT,
} from '@br/shared';
import type { EstimateLineKind, SavedRate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import {
  listSavedRates,
  createSavedRate,
  updateSavedRate,
  deleteSavedRate,
} from '../lib/estimates';

const KINDS: EstimateLineKind[] = [
  'material',
  'labour_day_rate',
  'labour_hourly',
  'fixed',
  'other',
];

function poundsToPence(s: string): number {
  const n = Number(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}
function num(s: string): number {
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function EstimateRatesScreen() {
  const router = useRouter();
  const { tenant, palette } = useTenant();

  const [rates, setRates] = useState<SavedRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<EstimateLineKind>('material');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('each');
  const [costText, setCostText] = useState('');
  const [markupText, setMarkupText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRates(await listSavedRates());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function reset() {
    setEditingId(null);
    setKind('material');
    setDescription('');
    setUnit('each');
    setCostText('');
    setMarkupText('');
  }

  function startEdit(r: SavedRate) {
    setEditingId(r.id);
    setKind(r.kind);
    setDescription(r.description);
    setUnit(r.unit);
    setCostText((r.default_unit_cost_pence / 100).toString());
    setMarkupText(
      r.default_markup_percent ? String(r.default_markup_percent) : '',
    );
  }

  async function onSave() {
    if (!tenant) return;
    if (description.trim().length < 1) {
      Alert.alert('Add a description', 'What is this rate for?');
      return;
    }
    setSaving(true);
    try {
      const base = {
        tenant_id: tenant.id,
        kind,
        description: description.trim(),
        unit: unit.trim() || ESTIMATE_LINE_KIND_DEFAULT_UNIT[kind],
        default_unit_cost_pence: poundsToPence(costText),
        default_markup_percent: num(markupText),
      };
      if (editingId) {
        await updateSavedRate({ id: editingId, ...base });
      } else {
        await createSavedRate(base);
      }
      reset();
      await load();
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  function onDelete(r: SavedRate) {
    Alert.alert('Delete this rate?', 'Existing quotes keep their values.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedRate(r.id);
            if (editingId === r.id) reset();
            await load();
          } catch (err) {
            Alert.alert(
              'Could not delete',
              err instanceof Error ? err.message : 'Unknown error',
            );
          }
        },
      },
    ]);
  }

  const field = [
    styles.field,
    {
      borderColor: palette.hairline,
      backgroundColor: palette.card,
      color: palette.ink,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: palette.card, borderBottomColor: palette.hairline },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          Saved rates
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* FORM */}
          <View
            style={[
              styles.card,
              { backgroundColor: palette.card, borderColor: palette.hairline },
            ]}
          >
            <Text style={[styles.formTitle, { color: palette.ink }]}>
              {editingId ? 'Edit rate' : 'Add a rate'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {KINDS.map((k) => {
                const active = kind === k;
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setKind(k)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? palette.primary : palette.canvas,
                        borderColor: active ? palette.primary : palette.hairline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : palette.ink },
                      ]}
                    >
                      {ESTIMATE_LINE_KIND_LABELS[k]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (e.g. Labourer)"
              placeholderTextColor={palette.inkMuted}
              style={[field, { marginTop: spacing.sm }]}
            />
            <View style={styles.row3}>
              <View style={styles.mini}>
                <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                  Unit
                </Text>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  style={field}
                  placeholder="each"
                  placeholderTextColor={palette.inkMuted}
                />
              </View>
              <View style={styles.mini}>
                <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                  Cost £
                </Text>
                <TextInput
                  value={costText}
                  onChangeText={(t) => setCostText(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  style={field}
                  placeholder="0.00"
                  placeholderTextColor={palette.inkMuted}
                />
              </View>
              <View style={styles.mini}>
                <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                  Markup %
                </Text>
                <TextInput
                  value={markupText}
                  onChangeText={(t) => setMarkupText(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  style={field}
                  placeholder="0"
                  placeholderTextColor={palette.inkMuted}
                />
              </View>
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity
                onPress={onSave}
                disabled={saving}
                style={[
                  styles.saveBtn,
                  { backgroundColor: saving ? palette.inkMuted : palette.primary },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {editingId ? 'Save changes' : 'Add rate'}
                  </Text>
                )}
              </TouchableOpacity>
              {editingId && (
                <TouchableOpacity
                  onPress={reset}
                  style={[styles.cancelBtn, { borderColor: palette.hairline }]}
                >
                  <Text style={[styles.cancelText, { color: palette.ink }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* LIST */}
          {loading ? (
            <ActivityIndicator color={palette.primary} style={{ marginTop: spacing.xl }} />
          ) : rates.length === 0 ? (
            <Text style={[styles.empty, { color: palette.inkMuted }]}>
              No saved rates yet. Add your common materials and labour above —
              they&apos;ll show as one-tap chips when you build a quote.
            </Text>
          ) : (
            rates.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.rateRow,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rateDesc, { color: palette.ink }]}>
                    {r.description}
                  </Text>
                  <Text style={[styles.rateMeta, { color: palette.inkMuted }]}>
                    {ESTIMATE_LINE_KIND_LABELS[r.kind]} ·{' '}
                    {gbp(r.default_unit_cost_pence)}/{r.unit}
                    {r.default_markup_percent > 0
                      ? ` · +${r.default_markup_percent}%`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => startEdit(r)} hitSlop={8}>
                  <Ionicons name="pencil" size={18} color={palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(r)}
                  hitSlop={8}
                  style={{ marginLeft: spacing.md }}
                >
                  <Ionicons name="trash-outline" size={18} color={palette.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  scroll: { padding: spacing.lg },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
    marginBottom: spacing.sm,
  },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  row3: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  mini: { flex: 1 },
  miniLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  saveBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  empty: {
    fontSize: typography.size.body,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rateDesc: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  rateMeta: { fontSize: typography.size.xs, marginTop: 2 },
});
