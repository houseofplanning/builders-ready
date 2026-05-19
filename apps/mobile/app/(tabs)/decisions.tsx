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
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import {
  listDecisionsForProject,
  type DecisionListItem,
} from '../../lib/decisions';
import { ProjectPickerButton } from '../../components/project-picker-button';
import { DecisionCard, urgencyOf } from '../../components/decision-card';

type Section = { kind: 'header'; label: string } | { kind: 'item'; data: DecisionListItem };

export default function DecisionsTab() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const { current } = useCurrentProject();
  const canRaise = role === 'owner' || role === 'pm';

  const [decisions, setDecisions] = useState<DecisionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) {
      setDecisions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await listDecisionsForProject(current.project.id);
    setDecisions(data);
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

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>
          {loading ? 'Loading…' : 'No project selected.'}
        </Text>
      </View>
    );
  }

  // Split into open + decided, sort open by urgency (overdue first), decided
  // by decided_at desc.
  const open = decisions
    .filter((d) => d.status === 'open')
    .sort((a, b) => {
      const ua = urgencyOf(a.deadline).daysLeft;
      const ub = urgencyOf(b.deadline).daysLeft;
      if (ua === null && ub === null) return 0;
      if (ua === null) return 1;
      if (ub === null) return -1;
      return ua - ub;
    });
  const decided = decisions
    .filter((d) => d.status !== 'open')
    .sort((a, b) =>
      (b.decided_at ?? '').localeCompare(a.decided_at ?? ''),
    );

  const sections: Section[] = [];
  if (open.length > 0) {
    sections.push({ kind: 'header', label: `Open · ${open.length}` });
    open.forEach((d) => sections.push({ kind: 'item', data: d }));
  }
  if (decided.length > 0) {
    sections.push({ kind: 'header', label: `Decided · ${decided.length}` });
    decided.forEach((d) => sections.push({ kind: 'item', data: d }));
  }

  return (
    <View style={[styles.shell, { backgroundColor: palette.canvas }]}>
      <FlatList
        data={sections}
        keyExtractor={(s, i) =>
          s.kind === 'header' ? `h-${s.label}-${i}` : s.data.id
        }
        ListHeaderComponent={
          <>
            <ProjectPickerButton />
            <Text style={[styles.subtitle, { color: palette.inkMuted }]}>
              {decisions.length === 0
                ? 'No decisions yet on this project.'
                : `${open.length} open · ${decided.length} decided`}
            </Text>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="checkbox-outline"
                size={42}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No decisions yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                {canRaise
                  ? 'Tap the + button to raise your first decision. Better than a 6pm WhatsApp.'
                  : 'When your PM needs a decision from you, it’ll appear here.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Text
                style={[styles.sectionHeader, { color: palette.inkMuted }]}
              >
                {item.label}
              </Text>
            );
          }
          return (
            <DecisionCard
              decision={item.data}
              onPress={() => router.push(`/decision/${item.data.id}`)}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={
          decisions.length === 0
            ? styles.flexGrow
            : { paddingBottom: spacing.xxl }
        }
      />

      {canRaise && (
        <TouchableOpacity
          onPress={() => router.push('/raise-decision')}
          activeOpacity={0.85}
          style={[
            styles.fab,
            { backgroundColor: palette.primary, shadowColor: palette.ink },
          ]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: typography.size.sm,
    paddingHorizontal: spacing.lg,
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
