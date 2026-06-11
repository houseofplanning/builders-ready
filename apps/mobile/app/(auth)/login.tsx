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
import { palette, spacing, radius, typography } from '@br/shared';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
    if (signInErr) {
      setError('Email or password is incorrect.');
    }
    // On success the root layout sees the new session and redirects to (tabs).
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text style={styles.wordmark}>BUILDERS READY</Text>
            <View style={styles.divider} />
            <Text style={styles.tag}>The client portal for UK builders</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.sub}>
              Use the email your builder invited you with, or your owner account.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              placeholder="you@example.com"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              placeholder="••••••••••••"
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
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/*
              Apple's anti-steering rules don't love iOS apps that link to
              external signup/billing flows. Builders Ready is a B2B SaaS
              where customers create their account on the web; the iOS app
              is the companion for already-onboarded users. Keep the login
              screen sign-in-only.
            */}
            <Text style={styles.linkText}>
              Use the same details you signed up with on the web.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
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
  tag: {
    fontSize: typography.size.sm,
    color: palette.inkMuted,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.hairline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.size.md,
    fontWeight: typography.weightSemibold as '600',
  },
  linkRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: typography.size.sm,
    color: palette.inkMuted,
  },
  linkStrong: {
    color: palette.primary,
    fontWeight: typography.weightSemibold as '600',
  },
});
