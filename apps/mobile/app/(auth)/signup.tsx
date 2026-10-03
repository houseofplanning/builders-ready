import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, spacing, radius, typography } from '@br/shared';
import { signUpCustomer } from '../../lib/marketplace';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (name.trim().length < 2 || !email.trim() || password.length < 8) {
      setError('Enter your name, email and a password (8+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      await signUpCustomer({ full_name: name, email, password });
      // On success the root layout sees the new session + no tenant and
      // routes to /customer.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.wordmark}>BUILDERS READY</Text>
            <View style={styles.divider} />
            <Text style={styles.tag}>Post a job — free</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.sub}>
              Describe what you need and local trades will come to you. Free, always.
            </Text>

            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Sarah Whitfield"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@email.com"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              style={[styles.button, submitting && styles.buttonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.linkRow} activeOpacity={0.7}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkStrong}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  wordmark: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: typography.trackingWide,
    color: palette.ink,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tag: { fontSize: typography.size.sm, color: palette.inkMuted },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: typography.size.sm,
    color: palette.inkMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  label: {
    fontSize: typography.size.xs,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    color: palette.ink,
    backgroundColor: palette.card,
  },
  error: {
    color: palette.error,
    fontSize: typography.size.sm,
    marginTop: spacing.md,
    backgroundColor: palette.errorSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.size.md,
    fontWeight: typography.weightSemibold as '600',
  },
  linkRow: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: typography.size.sm, color: palette.inkMuted },
  linkStrong: { color: palette.primary, fontWeight: typography.weightSemibold as '600' },
});
