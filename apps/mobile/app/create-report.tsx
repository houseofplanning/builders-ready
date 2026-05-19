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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  createStructuredReport,
  createPdfReport,
} from '../lib/reports';
import { uploadReportPdf } from '../lib/upload-pdf';

type Kind = 'structured' | 'pdf';

export default function CreateReportScreen() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();

  const [kind, setKind] = useState<Kind>('structured');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [risks, setRisks] = useState('');
  const [decisions, setDecisions] = useState('');
  const [pdfAsset, setPdfAsset] = useState<{ uri: string; name: string; size?: number } | null>(null);
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

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPdfAsset({ uri: asset.uri, name: asset.name, size: asset.size });
    // Auto-fill title from filename if blank
    if (!title.trim()) {
      const stem = asset.name.replace(/\.pdf$/i, '');
      setTitle(stem);
    }
  }

  const canSubmit =
    title.trim() &&
    (kind === 'structured' ? summary.trim() : !!pdfAsset);

  async function onSubmit() {
    if (!title.trim()) {
      Alert.alert('Add a title');
      return;
    }
    if (kind === 'structured' && !summary.trim()) {
      Alert.alert('Add a summary', 'A structured report needs at least a summary.');
      return;
    }
    if (kind === 'pdf' && !pdfAsset) {
      Alert.alert('Pick a PDF', 'Tap "Choose PDF" to attach a file.');
      return;
    }
    setSubmitting(true);
    try {
      if (kind === 'structured') {
        await createStructuredReport({
          tenant_id: tenant!.id,
          project_id: current!.project.id,
          posted_by: user_id!,
          title: title.trim(),
          summary: summary.trim(),
          next_week: nextWeek.trim() || null,
          risks: risks.trim() || null,
          decisions_needed: decisions.trim() || null,
        });
      } else {
        const path = await uploadReportPdf({
          tenantId: tenant!.id,
          projectId: current!.project.id,
          filename: pdfAsset!.name,
          uri: pdfAsset!.uri,
        });
        await createPdfReport({
          tenant_id: tenant!.id,
          project_id: current!.project.id,
          posted_by: user_id!,
          title: title.trim(),
          pdf_storage_path: path,
        });
      }
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert(
        'Could not post report',
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
          { backgroundColor: palette.card, borderBottomColor: palette.hairline },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.cancelText, { color: palette.inkMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>New report</Text>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting || !canSubmit}
          hitSlop={10}
        >
          {submitting ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Text
              style={[
                styles.postText,
                { color: canSubmit ? palette.primary : palette.inkMuted },
              ]}
            >
              Post
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
          {/* KIND TOGGLE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            Report type
          </Text>
          <View style={styles.segments}>
            <TouchableOpacity
              onPress={() => setKind('structured')}
              style={[
                styles.segment,
                {
                  backgroundColor: kind === 'structured' ? palette.primary : palette.card,
                  borderColor: kind === 'structured' ? palette.primary : palette.hairline,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="reader-outline"
                size={16}
                color={kind === 'structured' ? '#fff' : palette.ink}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: kind === 'structured' ? '#fff' : palette.ink },
                ]}
              >
                Structured form
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setKind('pdf')}
              style={[
                styles.segment,
                {
                  backgroundColor: kind === 'pdf' ? palette.primary : palette.card,
                  borderColor: kind === 'pdf' ? palette.primary : palette.hairline,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="document-attach-outline"
                size={16}
                color={kind === 'pdf' ? '#fff' : palette.ink}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: kind === 'pdf' ? '#fff' : palette.ink },
                ]}
              >
                Upload PDF
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: palette.inkMuted }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Week 12 progress report"
            placeholderTextColor={palette.inkMuted}
            style={[
              styles.field,
              {
                borderColor: palette.hairline,
                backgroundColor: palette.card,
                color: palette.ink,
              },
            ]}
          />

          {kind === 'structured' ? (
            <>
              <Text style={[styles.label, { color: palette.inkMuted }]}>
                Summary
              </Text>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                multiline
                numberOfLines={5}
                placeholder="What was done this week. Be specific."
                placeholderTextColor={palette.inkMuted}
                style={[
                  styles.field,
                  styles.textarea,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: palette.card,
                    color: palette.ink,
                  },
                ]}
              />

              <Text style={[styles.label, { color: palette.inkMuted }]}>
                Look-ahead — next week (optional)
              </Text>
              <TextInput
                value={nextWeek}
                onChangeText={setNextWeek}
                multiline
                numberOfLines={3}
                placeholder="What's planned, who's on site, materials arriving."
                placeholderTextColor={palette.inkMuted}
                style={[
                  styles.field,
                  styles.textarea,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: palette.card,
                    color: palette.ink,
                  },
                ]}
              />

              <Text style={[styles.label, { color: palette.inkMuted }]}>
                Risks (optional)
              </Text>
              <TextInput
                value={risks}
                onChangeText={setRisks}
                multiline
                numberOfLines={3}
                placeholder="Weather, supply delays, anything that could shift the schedule."
                placeholderTextColor={palette.inkMuted}
                style={[
                  styles.field,
                  styles.textarea,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: palette.card,
                    color: palette.ink,
                  },
                ]}
              />

              <Text style={[styles.label, { color: palette.inkMuted }]}>
                Decisions you need from the client (optional)
              </Text>
              <TextInput
                value={decisions}
                onChangeText={setDecisions}
                multiline
                numberOfLines={3}
                placeholder="If urgent decisions need raising, summarise here and use the Decisions tab for the structured ones."
                placeholderTextColor={palette.inkMuted}
                style={[
                  styles.field,
                  styles.textarea,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: palette.card,
                    color: palette.ink,
                  },
                ]}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: palette.inkMuted }]}>
                Upload PDF (max 40 MiB)
              </Text>
              {pdfAsset ? (
                <View
                  style={[
                    styles.pdfChosen,
                    { backgroundColor: palette.card, borderColor: palette.primary },
                  ]}
                >
                  <Ionicons
                    name="document-attach"
                    size={22}
                    color={palette.primary}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.pdfName, { color: palette.ink }]} numberOfLines={1}>
                      {pdfAsset.name}
                    </Text>
                    {pdfAsset.size && (
                      <Text style={[styles.pdfSize, { color: palette.inkMuted }]}>
                        {(pdfAsset.size / 1024 / 1024).toFixed(2)} MiB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setPdfAsset(null)} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={palette.inkMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickPdf}
                  activeOpacity={0.7}
                  style={[
                    styles.pdfPicker,
                    { borderColor: palette.hairline, backgroundColor: palette.card },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={26}
                    color={palette.primary}
                  />
                  <Text style={[styles.pdfPickerText, { color: palette.primary }]}>
                    Choose PDF from your phone
                  </Text>
                  <Text style={[styles.pdfPickerHint, { color: palette.inkMuted }]}>
                    Your existing weekly template works fine
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cancelText: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  postText: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
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
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  segments: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  pdfPicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  pdfPickerText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    marginTop: spacing.sm,
  },
  pdfPickerHint: {
    fontSize: typography.size.xs,
    marginTop: 4,
  },
  pdfChosen: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pdfName: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  pdfSize: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
});
