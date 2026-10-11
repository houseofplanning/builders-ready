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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { listMessagesForProject, sendMessage, markThreadRead, type ThreadMessage } from '../lib/messages';
import { uploadChatPhoto } from '../lib/upload-photo';

/**
 * The single per-project conversation, on the `messages` table. Used by the
 * customer (project client) — the builder has their own project Messages
 * screen on the same table, so both sides share one conversation after
 * hiring. RLS (has_project_access + project_tenant) lets the client read,
 * send and mark-read.
 */
export function ProjectChat({
  projectId,
  tenantId,
  title = 'Your builder',
}: {
  projectId: string;
  tenantId: string;
  title?: string;
}) {
  const router = useRouter();
  const { user_id, palette } = useTenant();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const data = await listMessagesForProject(projectId);
    setMessages(data);
    setLoading(false);
    if (user_id) markThreadRead({ project_id: projectId, reader_id: user_id }).catch(() => null);
  }, [projectId, user_id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSend() {
    const body = value.trim();
    if (!body || !user_id) return;
    setSending(true);
    try {
      await sendMessage({ tenant_id: tenantId, project_id: projectId, sender_id: user_id, body });
      setValue('');
      await load();
    } finally {
      setSending(false);
    }
  }

  async function onAttach() {
    if (!user_id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets[0]) return;
    setSending(true);
    try {
      const url = await uploadChatPhoto(user_id, res.assets[0].uri);
      await sendMessage({ tenant_id: tenantId, project_id: projectId, sender_id: user_id, body: '', image_url: url });
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
            <Ionicons name="chevron-back" size={26} color={palette.ink} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {messages.length === 0 ? (
              <Text style={[styles.empty, { color: palette.inkMuted }]}>
                Send a message to your builder about this project.
              </Text>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user_id;
                return (
                  <View key={m.id} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
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
          <TouchableOpacity onPress={onAttach} disabled={sending} hitSlop={8} style={{ paddingHorizontal: 2 }}>
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
  title: { flex: 1, textAlign: 'center', fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 8 },
  msgImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 9, fontSize: typography.size.body },
  send: { borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  sendText: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
});
