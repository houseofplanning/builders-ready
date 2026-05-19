import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import {
  listReportsForProject,
  type ReportListItem,
} from '../lib/reports';
import { ReportCard } from '../components/report-card';

type Section =
  | { kind: 'header'; label: string }
  | { kind: 'item'; data: ReportListItem };

export default function ReportsScreen() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const { current } = useCurrentProject();
  const canCreate = role === 'owner' || role === 'pm';

  const [items, setItems] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await listReportsForProject(current.project.id));
    setLoading(false);
  }, [current]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const unread = items.filter((r) => !r.acknowledged_at);
  const read = items.filter((r) => !!r.acknowledged_at);
  const sections: Section[] = [];
  if (unread.length > 0) {
    sections.push({ kind: 'header', label: `New · ${unread.length}` });
    unread.forEach((r) => sections.push({ kind: 'item', data: r }));
  }
  if (read.length > 0) {
    sections.push({ kind: 'header', label: `Read · ${read.length}` });
    read.forEach((r) => sections.push({ kind: 'item', data: r }));
  }

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
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          Reports
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s, i) =>
          s.kind === 'header' ? `h-${s.label}-${i}` : s.data.id
        }
        ListHeaderComponent={
          current ? (
            <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
              {current.project.name}
              {items.length === 0 ? ' · No reports yet on this project.' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="reader-outline"
                size={42}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No reports yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                {canCreate
                  ? 'Post a weekly summary (or upload your existing PDF) so the client knows where things stand.'
                  : 'Your PM will post weekly summary reports here.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Text style={[styles.sectionHeader, { color: palette.inkMuted }]}>
                {item.label}
              </Text>
            );
          }
          return (
            <ReportCard
              report={item.data}
              onPress={() => router.push(`/report/${item.data.id}`)}
            />
          );
        }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={
          items.length === 0 ? styles.flexGrow : { paddingBottom: spacing.xxl }
        }
      />

      {canCreate && (
        <TouchableOpacity
          onPress={() => router.push('/create-report')}
          activeOpacity={0.85}
          style={[
            styles.fab,
            { backgroundColor: palette.primary, shadowColor: palette.ink },
          ]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  subtitle: {
    fontSize: typography.size.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  flexGrow: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});
