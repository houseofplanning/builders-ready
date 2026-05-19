import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { raiseDecision } from '../lib/decisions';
import {
  compressImage,
  uploadDecisionPhoto,
  type CompressedAsset,
} from '../lib/upload-photo';

interface DraftOption {
  key: string;            // stable client-side id for keying + photo path
  label: string;
  description: string;
  priceText: string;      // "1499.99" — parsed to pence on submit
  photoAsset: CompressedAsset | null;
}

function newOption(): DraftOption {
  return {
    key: Math.random().toString(36).slice(2, 10),
    label: '',
    description: '',
    priceText: '',
    photoAsset: null,
  };
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parsePriceToPence(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[£,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const MAX_OPTIONS = 6;
const DEADLINE_PRESETS = [
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
];

export default function RaiseDecisionScreen() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState<number>(7);
  const [options, setOptions] = useState<DraftOption[]>([newOption(), newOption()]);
  const [submitting, setSubmitting] = useState(false);

  if (!current || !tenant || !user_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.center}>
          <Text>No project selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  function updateOption(idx: number, patch: Partial<DraftOption>) {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, newOption()]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function pickPhotoFor(idx: number) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Allow photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const compressed = await compressImage(result.assets[0].uri);
      updateOption(idx, { photoAsset: compressed });
    } catch (err) {
      Alert.alert(
        'Compression failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  async function onSubmit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Add a title', 'Tell your client what they’re deciding on.');
      return;
    }
    const cleanedOptions = options.filter((o) => o.label.trim());
    if (cleanedOptions.length < 2) {
      Alert.alert(
        'At least two options',
        'A decision needs at least two labelled options for the client to pick from.',
      );
      return;
    }
    // Validate prices
    for (const [i, o] of cleanedOptions.entries()) {
      if (o.priceText.trim() && parsePriceToPence(o.priceText) === null) {
        Alert.alert(
          `Option ${i + 1} price`,
          'Enter a valid £ amount or leave it blank.',
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Upload any photos first — they're addressed by option.key so we
      //    can stamp the path onto the option row before insert.
      const optionPayload: Parameters<typeof raiseDecision>[0]['options'] = [];
      for (const o of cleanedOptions) {
        let photoPath: string | null = null;
        if (o.photoAsset) {
          photoPath = await uploadDecisionPhoto({
            tenantId: tenant!.id,
            projectId: current!.project.id,
            optionKey: o.key,
            asset: o.photoAsset,
          });
        }
        optionPayload.push({
          label: o.label.trim(),
          description: o.description.trim() || null,
          price_gbp_pence: parsePriceToPence(o.priceText),
          photo_storage_path: photoPath,
        });
      }

      await raiseDecision({
        tenant_id: tenant!.id,
        project_id: current!.project.id,
        raised_by: user_id!,
        title: cleanTitle,
        description: description.trim() || null,
        deadline: daysFromNow(deadlineDays),
        options: optionPayload,
      });

      await refresh();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not raise decision',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: palette.hairline, backgroundColor: palette.card },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.cancelText, { color: palette.inkMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>
          Raise decision
        </Text>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting}
          hitSlop={10}
        >
          {submitting ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Text style={[styles.postText, { color: palette.primary }]}>
              Raise
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* TITLE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Kitchen worktop material"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
            ]}
          />

          {/* DESCRIPTION */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Context for the client (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Explain why this matters and what they should weigh up."
            placeholderTextColor={palette.inkMuted}
            multiline
            numberOfLines={3}
            style={[
              styles.field,
              styles.textarea,
              { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
            ]}
          />

          {/* DEADLINE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Deadline
          </Text>
          <View style={styles.segments}>
            {DEADLINE_PRESETS.map((opt) => {
              const active = deadlineDays === opt.days;
              return (
                <TouchableOpacity
                  key={opt.days}
                  onPress={() => setDeadlineDays(opt.days)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#fff' : palette.ink },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.deadlineNote, { color: palette.inkMuted }]}>
            Client sees this as &quot;Due {daysFromNow(deadlineDays)}&quot;.
          </Text>

          {/* OPTIONS */}
          <View style={styles.optionsHeader}>
            <Text style={[styles.label, { color: palette.inkMuted, marginTop: 0 }]}>
              Options ({options.length}/{MAX_OPTIONS})
            </Text>
            {options.length < MAX_OPTIONS && (
              <TouchableOpacity
                onPress={addOption}
                hitSlop={8}
                style={styles.addOptionBtn}
              >
                <Ionicons name="add" size={16} color={palette.primary} />
                <Text style={[styles.addOptionText, { color: palette.primary }]}>
                  Add option
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {options.map((o, idx) => (
            <View
              key={o.key}
              style={[
                styles.optionCard,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <View style={styles.optionHeader}>
                <Text
                  style={[styles.optionIndex, { color: palette.inkMuted }]}
                >
                  OPTION {idx + 1}
                </Text>
                {options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removeOption(idx)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={palette.inkMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                value={o.label}
                onChangeText={(t) => updateOption(idx, { label: t })}
                placeholder="Option label (e.g. Quartz worktop)"
                placeholderTextColor={palette.inkMuted}
                style={[
                  styles.field,
                  styles.optionField,
                  { borderColor: palette.hairline, color: palette.ink },
                ]}
              />
              <TextInput
                value={o.description}
                onChangeText={(t) => updateOption(idx, { description: t })}
                placeholder="What's included? (optional)"
                placeholderTextColor={palette.inkMuted}
                multiline
                style={[
                  styles.field,
                  styles.optionField,
                  styles.textareaSm,
                  { borderColor: palette.hairline, color: palette.ink },
                ]}
              />
              <View style={styles.priceRow}>
                <Text
                  style={[styles.priceCurrency, { color: palette.inkMuted }]}
                >
                  £
                </Text>
                <TextInput
                  value={o.priceText}
                  onChangeText={(t) =>
                    updateOption(idx, { priceText: t.replace(/[^0-9.,]/g, '') })
                  }
                  placeholder="0.00"
                  placeholderTextColor={palette.inkMuted}
                  keyboardType="decimal-pad"
                  style={[
                    styles.field,
                    styles.priceField,
                    { borderColor: palette.hairline, color: palette.ink },
                  ]}
                />
              </View>

              {o.photoAsset ? (
                <View style={styles.photoBlock}>
                  <Image
                    source={{ uri: o.photoAsset.uri }}
                    style={styles.photoPreview}
                  />
                  <TouchableOpacity
                    onPress={() => updateOption(idx, { photoAsset: null })}
                    style={styles.photoRemove}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => pickPhotoFor(idx)}
                  style={[
                    styles.photoAddBtn,
                    { borderColor: palette.hairline },
                  ]}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="image-outline"
                    size={18}
                    color={palette.primary}
                  />
                  <Text
                    style={[styles.photoAddText, { color: palette.primary }]}
                  >
                    Attach a photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <Text style={[styles.footerHint, { color: palette.inkMuted }]}>
            The client gets a notification (once push is wired). They can
            accept one option or reject all.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  postText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textareaSm: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  segments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  deadlineNote: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addOptionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optionIndex: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 0.8,
  },
  optionField: {
    backgroundColor: '#fff',
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  priceCurrency: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  priceField: {
    flex: 1,
    backgroundColor: '#fff',
  },
  photoBlock: {
    marginTop: spacing.xs,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    backgroundColor: '#eee',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(11,20,24,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  photoAddText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  footerHint: {
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
