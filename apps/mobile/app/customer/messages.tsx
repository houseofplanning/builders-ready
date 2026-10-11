import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { palette, spacing, typography, radius, relativeTime } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { listCustomerConversations, type CustomerConversation } from '../../lib/marketplace';

export default function CustomerMessages() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [convos, setConvos] = useState<CustomerConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user_id) return;
    setConvos(await listCustomerConversations(user_id));
    setLoading(false);
  }, [user_id]);

  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function open(c: CustomerConversation) {
    if (c.kind === 'project') router.push(`/customer/project-chat/${c.routeId}`);
    else router.push(`/customer/thread/${c.routeId}`);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Text style={styles.title}>Messages</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {convos.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={46} color={palette.inkMuted} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.empty}>
                Message a trade about a quote, or your builder on a live project — it all shows up here.
              </Text>
            </View>
          ) : (
            convos.map((c) => (
              <TouchableOpacity
                key={c.key}
                activeOpacity={0.7}
                onPress={() => open(c)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {c.title}
                    </Text>
                    {c.kind === 'project' && <Text style={styles.badgeProject}>Project</Text>}
                  </View>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {c.subtitle}
                  </Text>
                  <Text style={styles.rowWhen}>
                    {c.last_at ? relativeTime(c.last_at) : 'New conversation'}
                  </Text>
                </View>
                {c.unread > 0 ? (
                  <View style={styles.unread}>
                    <Text style={styles.unreadText}>{c.unread}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800', color: palette.ink, marginTop: spacing.md },
  empty: { textAlign: 'center', marginTop: spacing.sm, fontSize: typography.size.sm, color: palette.inkMuted, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: palette.card,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700', color: palette.ink, flexShrink: 1 },
  badgeProject: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    color: palette.primary,
    backgroundColor: '#E7F0F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  rowSub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
  rowWhen: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: typography.size.xs, fontWeight: typography.weightBold as '700' },
});
