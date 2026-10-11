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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import {
  getThreadMessages,
  sendMarketplaceMessage,
  markMarketplaceThreadRead,
  type ThreadMessageRow,
} from '../lib/marketplace';
import { uploadChatPhoto } from '../lib/upload-photo';

/**
 * The marketplace conversation view, shared by the trade route
 * (/mkt-thread/[id]) and the customer route (/customer/thread/[id]).
 * It only needs the signed-in user id and the palette, both of which are
 * available to trades and customers alike, so one implementation serves
 * both — and keeping a customer copy under /customer stops the AuthGate
 * from bouncing no-tenant customers out of the group.
 */
export function MarketplaceThread() {
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
    if (user_id) markMarketplaceThreadRead(id, user_id).catch(() => null);
  }, [id, user_id]);

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
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function onAttach() {
    if (!id || !user_id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets[0]) return;
    setSending(true);
    try {
      const url = await uploadChatPhoto(user_id, res.assets[0].uri);
      await sendMarketplaceMessage({ thread_id: id, sender_id: user_id, body: '', image_url: url });
      await load();
    } catch (err) {
      Alert.alert('Could not send photo', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: palette.canvas }}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.ink }]}>Conversation</Text>
        <View style={{ width: 26 }} />
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
                    {m.image_url ? (
                      <Image source={{ uri: m.image_url }} style={styles.msgImage} />
                    ) : null}
                    {m.body ? (
                      <Text style={{ color: mine ? '#fff' : palette.ink, fontSize: typography.size.body }}>
                        {m.body}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { borderTopColor: palette.hairline, backgroundColor: palette.card }]}>
        <TouchableOpacity onPress={onAttach} disabled={sending} hitSlop={8} style={styles.attach}>
          <Ionicons name="image-outline" size={24} color={palette.primary} />
        </TouchableOpacity>
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
  back: { width: 26 },
  title: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 8 },
  msgImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 2 },
  attach: { paddingHorizontal: 2 },
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
