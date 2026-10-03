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
import { useRouter } from 'expo-router';
import { palette, spacing, typography, radius, relativeTime } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { listCustomerThreads, type ThreadListItem } from '../../lib/marketplace';

export default function CustomerMessages() {
  const router = useRouter();
  const { user_id } = useTenant();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user_id) return;
    setThreads(await listCustomerThreads(user_id));
    setLoading(false);
  }, [user_id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Text style={styles.title}>Messages</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {threads.length === 0 ? (
            <Text style={styles.empty}>
              No messages yet. Message a trade from one of your quotes.
            </Text>
          ) : (
            threads.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/mkt-thread/${t.id}`)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t.title}</Text>
                  <Text style={styles.rowSub}>
                    {t.last_message_at ? relativeTime(t.last_message_at) : 'New conversation'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
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
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm, color: palette.inkMuted },
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
  rowTitle: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700', color: palette.ink },
  rowSub: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2 },
});
