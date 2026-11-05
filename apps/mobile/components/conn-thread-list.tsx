import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { listConnThreads, type ConnThread } from '../lib/conn-messages';

const ago = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

/** Shared list of builder<->sub chats. side='sub' for For Hire, 'builder' otherwise. */
export function ConnThreadList({ side, emptyHint }: { side: 'sub' | 'builder'; emptyHint: string }) {
  const { tenant } = useTenant();
  const router = useRouter();
  const [rows, setRows] = useState<ConnThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) { setLoading(false); return; }
    try { setRows(await listConnThreads(tenant.id, side)); } catch { /* retry */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [tenant, side]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator color={palette.primary} /></View>;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={palette.primary} />}
    >
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={40} color={palette.inkMuted} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>{emptyHint}</Text>
        </View>
      ) : (
        rows.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/conn-chat/[id]', params: { id: t.id, name: t.other_name } })}
          >
            <View style={styles.avatar}><Text style={styles.avatarText}>{t.other_name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{t.other_name}</Text>
              <Text style={styles.time}>{ago(t.last_message_at)} ago</Text>
            </View>
            {t.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{t.unread}</Text></View>}
            <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.hairline, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.primary, fontWeight: typography.weightBold as '700' },
  name: { fontSize: typography.size.md, fontWeight: typography.weightBold as '700', color: palette.ink },
  time: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: typography.weightBold as '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weightBold as '700', color: palette.ink, marginTop: spacing.md },
  emptyBody: { fontSize: typography.size.sm, color: palette.inkMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20, paddingHorizontal: spacing.lg },
});
