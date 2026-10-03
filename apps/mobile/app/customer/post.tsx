import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, spacing, typography, radius, TRADE_CATEGORIES } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { createJobRequest } from '../../lib/marketplace';

function poundsToPence(s: string): number | undefined {
  const t = s.replace(/[£,]/g, '').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

export default function PostJob() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [bmin, setBmin] = useState('');
  const [bmax, setBmax] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!category || title.trim().length < 3 || postcode.trim().length < 2) {
      setError('Pick a trade, add a title and a postcode.');
      return;
    }
    if (!user_id) return;
    setSubmitting(true);
    try {
      await createJobRequest({
        customer_id: user_id,
        trade_category: category,
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        postcode: postcode.trim(),
        budget_min_pence: poundsToPence(bmin) ?? null,
        budget_max_pence: poundsToPence(bmax) ?? null,
      });
      router.replace('/customer/requests');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post job.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Post a job</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>What do you need?</Text>
          <View style={styles.chips}>
            {TRADE_CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: palette.primary, borderColor: palette.primary }
                      : { borderColor: palette.hairline, backgroundColor: palette.card },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : palette.ink, fontSize: typography.size.sm }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Job title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Boiler replacement"
            placeholderTextColor={palette.inkMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Describe the job</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What needs doing, and when you'd like it done."
            multiline
            placeholderTextColor={palette.inkMuted}
            style={[styles.input, styles.multiline]}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Postcode</Text>
              <TextInput
                value={postcode}
                onChangeText={setPostcode}
                autoCapitalize="characters"
                placeholder="SW19 8HP"
                placeholderTextColor={palette.inkMuted}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Town (optional)</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="London"
                placeholderTextColor={palette.inkMuted}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Budget (optional)</Text>
          <View style={styles.row}>
            <TextInput
              value={bmin}
              onChangeText={setBmin}
              keyboardType="numeric"
              placeholder="£ min"
              placeholderTextColor={palette.inkMuted}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={bmax}
              onChangeText={setBmax}
              keyboardType="numeric"
              placeholder="£ max"
              placeholderTextColor={palette.inkMuted}
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitting}
            style={[styles.submit, { opacity: submitting ? 0.6 : 1 }]}
          >
            <Text style={styles.submitText}>{submitting ? 'Posting…' : 'Post job — it’s free'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: { padding: 4, marginRight: 4 },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: typography.size.xs,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
    color: palette.ink,
    backgroundColor: palette.card,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm },
  error: { color: palette.error, fontSize: typography.size.sm, marginTop: spacing.md },
  submit: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
