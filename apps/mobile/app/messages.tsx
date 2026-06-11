import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, relativeTime } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  listMessagesForProject,
  sendMessage,
  markThreadRead,
  type ThreadMessage,
} from '../lib/messages';

export default function MessagesScreen() {
  const router = useRouter();
  const { tenant, role, palette, user_id } = useTenant();
  const { current } = useCurrentProject();
  const listRef = useRef<FlatList<ThreadMessage>>(null);

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!current || !user_id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await listMessagesForProject(current.project.id);
    setMessages(data);
    setLoading(false);
    // Best-effort mark read once we've loaded.
    markThreadRead({
      project_id: current.project.id,
      reader_id: user_id,
    }).catch(() => null);
    // Scroll to bottom after layout settles.
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [current, user_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !current || !tenant || !user_id) return;
    setSending(true);
    setDraft(''); // optimistic clear
    try {
      await sendMessage({
        tenant_id: tenant.id,
        project_id: current.project.id,
        sender_id: user_id,
        body,
      });
      const next = await listMessagesForProject(current.project.id);
      setMessages(next);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      setDraft(body); // restore draft on failure
      Alert.alert(
        'Could not send',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSending(false);
    }
  }

  if (!current) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>No project selected.</Text>
      </SafeAreaView>
    );
  }

  const pmName = current.project.pm?.full_name ?? 'your project manager';
  const clientName = current.project.client?.full_name ?? 'the client';
  const otherPartyLabel =
    role === 'client'
      ? `your project manager (${pmName})`
      : `the client (${clientName})`;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: palette.card, borderBottomColor: palette.hairline },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={palette.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: palette.ink }]}>
            Messages
          </Text>
          <Text style={[styles.headerSub, { color: palette.inkMuted }]}>
            with {role === 'client' ? pmName : clientName}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.md,
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={42}
                  color={palette.inkMuted}
                />
                <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                  Say hello
                </Text>
                <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                  Direct chat with {otherPartyLabel}. Use it for quick
                  questions; for things that need a record, use Decisions or
                  Variations.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = item.sender_id === user_id;
              const prev = messages[index - 1];
              const showSender = !prev || prev.sender_id !== item.sender_id;
              return (
                <View
                  style={[
                    styles.bubbleRow,
                    { justifyContent: mine ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <View style={{ maxWidth: '78%' }}>
                    {showSender && !mine && (
                      <Text style={[styles.senderName, { color: palette.inkMuted }]}>
                        {item.sender_name}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: palette.primary }
                          : {
                              backgroundColor: palette.card,
                              borderColor: palette.hairline,
                              borderWidth: 1,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          { color: mine ? '#fff' : palette.ink },
                        ]}
                      >
                        {item.body}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.timestamp,
                        {
                          color: palette.inkMuted,
                          textAlign: mine ? 'right' : 'left',
                        },
                      ]}
                    >
                      {relativeTime(item.sent_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.composer,
            { backgroundColor: palette.card, borderTopColor: palette.hairline },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={palette.inkMuted}
            multiline
            style={[
              styles.input,
              {
                borderColor: palette.hairline,
                backgroundColor: palette.canvas,
                color: palette.ink,
              },
            ]}
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={sending || !draft.trim()}
            activeOpacity={0.85}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  sending || !draft.trim() ? palette.inkMuted : palette.primary,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
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
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  headerSub: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  emptyBody: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  senderName: {
    fontSize: typography.size.xs,
    marginBottom: 2,
    marginLeft: spacing.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: typography.size.body,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.size.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
