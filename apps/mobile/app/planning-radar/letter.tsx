import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getPlanningListing,
  buildLetterDraft,
  emailPlanningLetter,
  type PlanningListing,
} from '../../lib/planning-radar';

export default function PlanningLetterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tenant, palette } = useTenant();

  const [listing, setListing] = useState<PlanningListing | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!id) return;
      try {
        const l = await getPlanningListing(id);
        setListing(l);
        if (l && tenant) {
          setBody(buildLetterDraft(l, tenant.name, tenant.business_phone ?? null));
        }
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    })();
  }, [id, tenant]);

  async function send() {
    if (!id || !body.trim()) return;
    setSending(true);
    try {
      const { to } = await emailPlanningLetter(id, body);
      Alert.alert(
        'Letter sent',
        to
          ? `We've emailed the letter to ${to}. Print it and post it through the door.`
          : "We've emailed the letter to you. Print it and post it through the door.",
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Draft a letter</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {!!listing && (
              <Text style={[styles.to, { color: palette.inkMuted }]}>
                To: The Occupier, {listing.address}
              </Text>
            )}
            <Text style={[styles.hint, { color: palette.inkMuted }]}>
              This is addressed to the occupier using the public planning record —
              no personal details. Edit anything you like, then send it to your own
              email to print and post.
            </Text>

            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              style={[styles.editor, { color: palette.ink, borderColor: palette.hairline, backgroundColor: palette.card }]}
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: palette.hairline, backgroundColor: palette.canvas }]}>
            <TouchableOpacity
              onPress={send}
              disabled={sending || !body.trim()}
              activeOpacity={0.85}
              style={[styles.sendBtn, { backgroundColor: palette.primary, opacity: sending || !body.trim() ? 0.6 : 1 }]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Email it to me to print</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  to: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
  hint: { fontSize: typography.size.xs, lineHeight: 18, marginTop: spacing.sm, marginBottom: spacing.md },
  editor: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.size.body,
    lineHeight: 22,
    minHeight: 360,
  },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  sendBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
