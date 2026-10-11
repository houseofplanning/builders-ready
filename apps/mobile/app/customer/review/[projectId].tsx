import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../../lib/tenant-provider';
import { getCustomerProject, submitCustomerReview, type ProjectHeader } from '../../../lib/marketplace';

export default function CustomerReview() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user_id } = useTenant();
  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    try {
      setProject(await getCustomerProject(projectId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setError(null);
    if (rating < 1) {
      setError('Pick a star rating.');
      return;
    }
    if (!project || !user_id) return;
    setBusy(true);
    try {
      await submitCustomerReview({
        project_id: project.id,
        reviewee_id: project.pm_id,
        tenant_id: project.tenant_id,
        reviewer_id: user_id,
        rating,
        body: body.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit review.');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !project) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={palette.primary} />
          </TouchableOpacity>
          <Text style={styles.htitle}>Leave a review</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={palette.inkMuted} />
          <Text style={[styles.sub, { textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg }]}>
            {loadError
              ? "Couldn't load this project. Please try again."
              : 'This project is no longer available.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.submit, { paddingHorizontal: spacing.xl, marginTop: spacing.lg }]}>
            <Text style={styles.submitText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.htitle}>Leave a review</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.q}>How was {project?.trade_name ?? 'the trade'}?</Text>
          <Text style={styles.sub}>Your review helps other homeowners.</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={n <= rating ? palette.accent : palette.hairline}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Quality, timekeeping, tidiness…"
            multiline
            placeholderTextColor={palette.inkMuted}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity disabled={busy} onPress={submit} style={styles.submit}>
            <Text style={styles.submitText}>{busy ? 'Submitting…' : 'Submit review'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: { padding: 4, marginRight: 4 },
  htitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  body: { padding: spacing.lg },
  q: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
    color: palette.ink,
    minHeight: 96,
    textAlignVertical: 'top',
    marginTop: spacing.lg,
    backgroundColor: palette.card,
  },
  error: { color: palette.error, fontSize: typography.size.sm, marginTop: spacing.sm },
  submit: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
