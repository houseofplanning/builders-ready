import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  spacing,
  typography,
  radius,
  type ProjectStage,
  type StageStatus,
} from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { supabase } from '../lib/supabase';
import {
  compressImage,
  uploadPhoto,
  type CompressedAsset,
} from '../lib/upload-photo';

const STAGE_STATUS_OPTIONS: {
  value: 'keep' | StageStatus;
  label: string;
}[] = [
  { value: 'keep', label: 'Keep current' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'delayed', label: 'Delayed' },
];

const MAX_PHOTOS = 10;

export default function ComposeUpdate() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();

  const defaultStageId = useMemo(() => {
    if (!current) return '';
    return (
      current.stages.find((s) => s.status === 'in_progress')?.id ??
      current.stages.find((s) => s.status === 'not_started')?.id ??
      current.stages[0]?.id ??
      ''
    );
  }, [current]);

  const [stageId, setStageId] = useState<string>(defaultStageId);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [decisionNeeded, setDecisionNeeded] = useState('');
  const [stageStatus, setStageStatus] = useState<'keep' | StageStatus>(
    'keep',
  );
  const [photos, setPhotos] = useState<CompressedAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  if (!current || !tenant || !user_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.center}>
          <Text>No project selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedStage =
    current.stages.find((s) => s.id === stageId) ?? current.stages[0];

  async function pickFromGallery() {
    if (photos.length >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to attach images.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 1,
    });
    if (result.canceled) return;
    await addAssets(result.assets.map((a) => a.uri));
  }

  async function takePhoto() {
    if (photos.length >= MAX_PHOTOS) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow camera access to capture a site photo.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;
    await addAssets(result.assets.map((a) => a.uri));
  }

  async function addAssets(uris: string[]) {
    setSubmitting(true);
    try {
      const compressed: CompressedAsset[] = [];
      for (const uri of uris.slice(0, MAX_PHOTOS - photos.length)) {
        const c = await compressImage(uri);
        compressed.push(c);
      }
      setPhotos((p) => [...p, ...compressed]);
    } catch (err) {
      Alert.alert(
        'Compression failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    if (!body.trim()) {
      Alert.alert('Add some text', 'A blank update isn’t much use to your client.');
      return;
    }
    if (!stageId) {
      Alert.alert('Pick a stage');
      return;
    }
    setSubmitting(true);
    try {
      // 1. If a stage status change was requested, flip it first.
      if (stageStatus !== 'keep') {
        const payload: {
          status: StageStatus;
          actual_end_date: string | null;
        } = {
          status: stageStatus,
          actual_end_date:
            stageStatus === 'complete'
              ? new Date().toISOString().slice(0, 10)
              : null,
        };
        const { error: stageErr } = await supabase
          .from('project_stages')
          .update(payload)
          .eq('id', stageId);
        if (stageErr) throw new Error(`Stage flip: ${stageErr.message}`);
      }

      // 2. Insert the update row.
      const { data: row, error: updErr } = await supabase
        .from('project_updates')
        .insert({
          tenant_id: tenant!.id,
          project_id: current!.project.id,
          stage_id: stageId,
          posted_by: user_id,
          headline: headline.trim() || null,
          body: body.trim(),
          decision_needed: decisionNeeded.trim() || null,
        })
        .select('id')
        .single();
      if (updErr || !row) throw new Error(updErr?.message ?? 'Insert failed');

      // 3. Upload each photo sequentially with progress.
      if (photos.length > 0) {
        setUploadProgress({ done: 0, total: photos.length });
        for (let i = 0; i < photos.length; i++) {
          await uploadPhoto({
            tenantId: tenant!.id,
            projectId: current!.project.id,
            updateId: row.id,
            index: i,
            asset: photos[i],
          });
          setUploadProgress({ done: i + 1, total: photos.length });
        }
      }

      await refresh();
      router.back();
    } catch (err) {
      Alert.alert(
        'Failed to post',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: palette.canvas }]} edges={['top', 'bottom']}>
      <View
        style={[styles.header, { borderBottomColor: palette.hairline, backgroundColor: palette.card }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.cancelText, { color: palette.inkMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>New update</Text>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting || !body.trim()}
          hitSlop={10}
        >
          <Text
            style={[
              styles.postText,
              { color: !submitting && body.trim() ? palette.primary : palette.inkMuted },
            ]}
          >
            Post
          </Text>
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
          {/* STAGE PICKER */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>Stage</Text>
          <TouchableOpacity
            onPress={() => setStagePickerOpen(true)}
            style={[
              styles.field,
              styles.pickerField,
              { borderColor: palette.hairline, backgroundColor: palette.card },
            ]}
            activeOpacity={0.6}
          >
            <Text style={[styles.pickerText, { color: palette.ink }]}>
              {selectedStage
                ? `${selectedStage.position}. ${selectedStage.name}`
                : 'Choose a stage'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={palette.inkMuted} />
          </TouchableOpacity>

          {/* STAGE STATUS CHANGE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Change stage status
          </Text>
          <View style={styles.segments}>
            {STAGE_STATUS_OPTIONS.map((opt) => {
              const active = stageStatus === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStageStatus(opt.value)}
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

          {/* HEADLINE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Headline (optional)
          </Text>
          <TextInput
            value={headline}
            onChangeText={setHeadline}
            placeholder="e.g. Plasterboard up on first floor"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
            ]}
          />

          {/* BODY */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            What happened today?
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={5}
            placeholder="Walk the client through site progress. Decorators arrive Monday; first-fix electrics signed off this afternoon."
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              styles.textarea,
              { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
            ]}
          />

          {/* PHOTOS */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Photos ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((p, i) => (
              <View key={`${p.uri}-${i}`} style={styles.photoTile}>
                <Image source={{ uri: p.uri }} style={styles.photoTileImage} />
                <TouchableOpacity
                  onPress={() => removePhoto(i)}
                  style={styles.photoRemove}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <View style={styles.photoAddRow}>
                <TouchableOpacity
                  onPress={takePhoto}
                  disabled={submitting}
                  style={[
                    styles.photoAddBtn,
                    { borderColor: palette.hairline, backgroundColor: palette.card },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={20} color={palette.primary} />
                  <Text style={[styles.photoAddText, { color: palette.primary }]}>
                    Take photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickFromGallery}
                  disabled={submitting}
                  style={[
                    styles.photoAddBtn,
                    { borderColor: palette.hairline, backgroundColor: palette.card },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={20} color={palette.primary} />
                  <Text style={[styles.photoAddText, { color: palette.primary }]}>
                    Choose from library
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* DECISION NEEDED */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Decision needed from client (optional)
          </Text>
          <TextInput
            value={decisionNeeded}
            onChangeText={setDecisionNeeded}
            placeholder="e.g. Which worktop should we order for the kitchen?"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
            ]}
          />

          {uploadProgress && (
            <View
              style={[
                styles.progressBox,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <ActivityIndicator color={palette.primary} />
              <Text style={[styles.progressText, { color: palette.primary }]}>
                Uploading photo {uploadProgress.done}/{uploadProgress.total}…
              </Text>
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* STAGE PICKER MODAL */}
      <Modal
        visible={stagePickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStagePickerOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: palette.hairline },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.ink }]}>
              Pick a stage
            </Text>
            <TouchableOpacity onPress={() => setStagePickerOpen(false)}>
              <Ionicons name="close" size={26} color={palette.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {current.stages.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setStageId(s.id);
                  setStagePickerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.modalRow,
                  {
                    borderBottomColor: palette.hairline,
                    backgroundColor: pressed
                      ? palette.primarySoft
                      : palette.card,
                  },
                ]}
              >
                <Text style={[styles.modalRowText, { color: palette.ink }]}>
                  {s.position}. {s.name}
                </Text>
                {s.id === stageId && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={palette.primary}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    minHeight: 110,
    textAlignVertical: 'top',
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  photoTileImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eee',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(11,20,24,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    minWidth: '100%',
  },
  photoAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  photoAddText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  progressText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalRowText: {
    flex: 1,
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
});
