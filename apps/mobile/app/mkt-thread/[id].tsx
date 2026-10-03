import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getThreadMessages,
  sendMarketplaceMessage,
  type ThreadMessageRow,
} from '../../lib/marketplace';

export default function MarketplaceThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user_id, palette } = useTenant();

  const [messages, setMessages] = useState<ThreadMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setMessages(await getThreadMessages(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSend() {
    const body = value.trim();
    if (!body || !id || !user_id) return;
    setSending(true);
    try {
      await sendMarketplaceMessage({ thread_id: id, sender_id: user_id, body });
      setValue('');
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>Conversation</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {messages.length === 0 ? (
            <Text style={[styles.empty, { color: palette.inkMuted }]}>
              Say hello to get started.
            </Text>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user_id;
              return (
                <View
                  key={m.id}
                  style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? { backgroundColor: palette.primary }
                        : { backgroundColor: palette.card, borderColor: palette.hairline, borderWidth: 1 },
                    ]}
                  >
                    <Text style={{ color: mine ? '#fff' : palette.ink, fontSize: typography.size.body }}>
                      {m.body}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { borderTopColor: palette.hairline, backgroundColor: palette.card }]}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Message…"
          placeholderTextColor={palette.inkMuted}
          style={[styles.input, { borderColor: palette.hairline, color: palette.ink }]}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={sending || !value.trim()}
          style={[styles.send, { backgroundColor: palette.primary, opacity: sending || !value.trim() ? 0.5 : 1 }]}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  back: { padding: 4, marginRight: 4 },
  title: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 8 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: typography.size.body,
  },
  send: { borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  sendText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
});
