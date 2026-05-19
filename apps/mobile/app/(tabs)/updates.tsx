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
import { supabase } from '../../lib/supabase';
import { ProjectPickerButton } from '../../components/project-picker-button';
import { UpdateCard } from '../../components/update-card';

interface FeedUpdate {
  id: string;
  headline: string | null;
  body: string;
  decision_needed: string | null;
  posted_at: string;
  posted_by_name: string;
  stage_name: string;
  photos: Array<{
    id: string;
    storage_path: string;
    width: number;
    height: number;
  }>;
}

export default function UpdatesTab() {
  const router = useRouter();
  const { role, palette } = useTenant();
  const { current } = useCurrentProject();
  const canWrite = role === 'owner' || role === 'pm';

  const [items, setItems] = useState<FeedUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!current) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('project_updates')
      .select(
        `id, headline, body, decision_needed, posted_at,
         posted_by_profile:profiles!project_updates_posted_by_fkey(full_name),
         stage:project_stages!project_updates_stage_id_fkey(name),
         photos:update_photos(id, storage_path, width, height, position)`,
      )
      .eq('project_id', current.project.id)
      .order('posted_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(
      data.map((u) => {
        const poster = Array.isArray(u.posted_by_profile)
          ? u.posted_by_profile[0]
          : u.posted_by_profile;
        const stage = Array.isArray(u.stage) ? u.stage[0] : u.stage;
        const photos = (u.photos ?? []) as Array<{
          id: string;
          storage_path: string;
          width: number;
          height: number;
          position: number;
        }>;
        return {
          id: u.id,
          headline: u.headline,
          body: u.body,
          decision_needed: u.decision_needed,
          posted_at: u.posted_at,
          posted_by_name: poster?.full_name ?? 'Unknown',
          stage_name: stage?.name ?? '—',
          photos: photos.sort((a, b) => a.position - b.position),
        };
      }),
    );
    setLoading(false);
  }, [current]);

  // Reload whenever we focus the tab (e.g. coming back from the composer).
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

  return (
    <View style={[styles.shell, { backgroundColor: palette.canvas }]}>
      <FlatList
        data={items}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UpdateCard update={item} />}
        ListHeaderComponent={
          <>
            <ProjectPickerButton />
            <Text
              style={[
                styles.subtitle,
                { color: palette.inkMuted },
              ]}
            >
              {items.length} update{items.length === 1 ? '' : 's'} on this project
            </Text>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="camera-outline"
                size={42}
                color={palette.inkMuted}
              />
              <Text style={[styles.emptyTitle, { color: palette.ink }]}>
                No updates yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
                {canWrite
                  ? 'Post the first site-visit update — text plus up to 10 photos.'
                  : 'Your PM will post site-visit photos and notes here as work progresses.'}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={
          items.length === 0 ? styles.flexGrow : { paddingBottom: spacing.xxl }
        }
      />

      {canWrite && (
        <TouchableOpacity
          onPress={() => router.push('/compose-update')}
          style={[
            styles.fab,
            {
              backgroundColor: palette.primary,
              shadowColor: palette.ink,
            },
          ]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
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
  flexGrow: {
    flexGrow: 1,
  },
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
