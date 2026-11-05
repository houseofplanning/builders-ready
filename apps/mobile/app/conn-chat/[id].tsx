import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { supabase } from '../../lib/supabase';
import { listConnMessages, sendConnMessage, markConnThreadRead, type ConnMessage } from '../../lib/conn-messages';

export default function ConnChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<ConnMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const listRef = useRef<FlatList<ConnMessage>>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [{ data: auth }, msgs] = await Promise.all([supabase.auth.getUser(), listConnMessages(id)]);
      setMyUid(auth.user?.id ?? null);
      setMessages(msgs);
      void markConnThreadRead(id);
    } catch { /* retry */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => {
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]));

  async function send() {
    const body = text.trim();
    if (!body || !id) return;
    setSending(true);
    setText('');
    try {
      await sendConnMessage(id, body);
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { setText(body); } finally { setSending(false); }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{name || 'Messages'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={palette.primary} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.scroll}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello.</Text>}
            renderItem={({ item }) => {
              const mine = item.sender_id === myUid;
              return (
                <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, { color: mine ? '#fff' : palette.ink }]}>{item.body}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message…"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
              multiline
            />
            <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, { opacity: sending || !text.trim() ? 0.5 : 1 }]}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.hairline },
  title: { flex: 1, fontSize: typography.size.lg, fontWeight: typography.weightBold as '700', color: palette.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: 8 },
  empty: { textAlign: 'center', color: palette.inkMuted, marginTop: spacing.xl, fontSize: typography.size.sm },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  mine: { backgroundColor: palette.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.hairline, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: typography.size.sm, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: spacing.md, borderTopWidth: 1, borderTopColor: palette.hairline, backgroundColor: palette.canvas },
  input: { flex: 1, maxHeight: 120, borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.size.sm, color: palette.ink, backgroundColor: palette.card },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
});
