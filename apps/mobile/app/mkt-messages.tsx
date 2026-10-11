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
import { spacing, typography, radius, relativeTime } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { listTradeThreads, type ThreadListItem } from '../lib/marketplace';

export default function MarketplaceMessagesScreen() {
  const router = useRouter();
  const { tenant, palette } = useTenant();
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenant) return;
    setThreads(await listTradeThreads(tenant.id));
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Messages</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {threads.length === 0 ? (
            <Text style={[styles.empty, { color: palette.inkMuted }]}>
              No messages yet. Message a customer from a job in the Marketplace.
            </Text>
          ) : (
            threads.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/mkt-thread/${t.id}`)}
                style={[styles.row, { backgroundColor: palette.card, borderColor: palette.hairline }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: palette.ink }]}>{t.title}</Text>
                  <Text style={[styles.rowSub, { color: palette.inkMuted }]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  rowSub: { fontSize: typography.size.xs, marginTop: 2 },
});
