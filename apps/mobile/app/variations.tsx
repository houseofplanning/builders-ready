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
  listVariationsForProject,
  type VariationListItem,
} from '../lib/variations';
import { VariationCard } from '../components/variation-card';

type Section =
  | { kind: 'header'; label: string }
  | { kind: 'item'; data: VariationListItem };

export default function VariationsScreen() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const { current } = useCurrentProject();
  const canPropose = role === 'owner' || role === 'pm';

  const [items, setItems] = useState<VariationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setItems(await listVariationsForProject(current.project.id));
    setLoading(false);
  }, [current]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  // Group: proposed first (most actionable), then accepted, then rejected.
  const proposed = items.filter((v) => v.status === 'proposed');
  const accepted = items
    .filter((v) => v.status === 'accepted')
    .sort((a, b) =>
      (b.decided_at ?? '').localeCompare(a.decided_at ?? ''),
    );
  const rejected = items.filter(
    (v) => v.status === 'rejected' || v.status === 'cancelled',
  );

  const sections: Section[] = [];
  if (proposed.length > 0) {
    sections.push({ kind: 'header', label: `Awaiting signature · ${proposed.length}` });
    proposed.forEach((v) => sections.push({ kind: 'item', data: v }));
  }
  if (accepted.length > 0) {
    sections.push({ kind: 'header', label: `Signed · ${accepted.length}` });
    accepted.forEach((v) => sections.push({ kind: 'item', data: v }));
  }
  if (rejected.length > 0) {
    sections.push({ kind: 'header', label: `Rejected · ${rejected.length}` });
    rejected.forEach((v) => sections.push({ kind: 'item', data: v }));
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
          Variations
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
              {items.length > 0 ? '' : ' · No variations yet on this project.'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="document-text-outline"
                size={42}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No variations yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                {canPropose
                  ? 'Propose a scope change with a £ delta and the client signs it off in-app.'
                  : 'When your PM proposes a scope change, it will appear here for you to sign or reject.'}
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
            <VariationCard
              variation={item.data}
              onPress={() => router.push(`/variation/${item.data.id}`)}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={
          items.length === 0 ? styles.flexGrow : { paddingBottom: spacing.xxl }
        }
      />

      {canPropose && (
        <TouchableOpacity
          onPress={() => router.push('/propose-variation')}
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
