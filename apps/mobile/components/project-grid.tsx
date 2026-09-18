import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { ProjectStatusPill } from './stage-pill';
import { ProgressBar } from './progress-bar';

/**
 * Quotes entry point. Estimates live BEFORE any project exists, so builders
 * need to reach them from the pre-project grid — including when they have no
 * projects at all (a brand-new builder quoting their first prospect). Only
 * owners and PMs quote; clients never see this.
 */
function QuotesEntry() {
  const { palette } = useTenant();
  const router = useRouter();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/estimates')}
      style={[
        gridStyles.quotesCard,
        { backgroundColor: palette.primarySoft, borderColor: palette.primary },
      ]}
    >
      <View
        style={[
          gridStyles.quotesIcon,
          { backgroundColor: palette.card, borderColor: palette.primary },
        ]}
      >
        <Ionicons name="calculator-outline" size={22} color={palette.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[gridStyles.quotesTitle, { color: palette.ink }]}>
          Quotes &amp; estimates
        </Text>
        <Text style={[gridStyles.quotesSub, { color: palette.inkMuted }]}>
          Build a quote on site — win it and it becomes a project
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.primary} />
    </TouchableOpacity>
  );
}

const gridStyles = StyleSheet.create({
  quotesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  quotesIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quotesTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
  },
  quotesSub: {
    fontSize: typography.size.xs,
    marginTop: 2,
    lineHeight: 16,
  },
});

/**
 * Project picker grid. Shown as the Home tab when no project is selected
 * (typical for owners and PMs with multiple projects). Tapping a card sets
 * the current selection so the rest of the app — tabs, decisions list,
 * messages — scope to that one project.
 *
 * Clients with a single assigned project never see this; the provider
 * auto-selects for them.
 */
export function ProjectGrid() {
  const { tenant, role, palette } = useTenant();
  const { projects, loading, setSelectedId, refresh } = useCurrentProject();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!tenant) return null;

  if (projects.length === 0 && !loading) {
    return (
      <ScrollView
        style={{ backgroundColor: palette.canvas }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {role !== 'client' && <QuotesEntry />}
        <View style={styles.emptyInline}>
          <Ionicons
            name="folder-open-outline"
            size={56}
            color={palette.inkMuted}
          />
          <Text style={[styles.emptyTitle, { color: palette.ink }]}>
            No projects yet
          </Text>
          <Text style={[styles.emptyBody, { color: palette.inkMuted }]}>
            {role === 'client'
              ? "Your builder hasn't set up a project for you yet."
              : 'Win a quote above to start your first project, or create one from the web admin at app.buildersready.uk.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      <Text style={[styles.heading, { color: palette.ink }]}>
        Your projects
      </Text>
      <Text style={[styles.sub, { color: palette.inkMuted }]}>
        Tap a project to open it. Tabs will appear once you&apos;re inside.
      </Text>

      {role !== 'client' && <QuotesEntry />}

      {projects.map((p) => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.85}
          onPress={() => setSelectedId(p.id)}
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text
                style={[styles.cardTitle, { color: palette.ink }]}
                numberOfLines={2}
              >
                {p.name}
              </Text>
              <Text style={[styles.cardAddress, { color: palette.inkMuted }]}>
                {p.city} · {p.postcode}
              </Text>
            </View>
            <ProjectStatusPill status={p.status} />
          </View>

          <View style={styles.cardProgress}>
            <Text style={[styles.cardPercent, { color: palette.ink }]}>
              {p.progress_percent}%
            </Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <ProgressBar percent={p.progress_percent} height={8} />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardCta, { color: palette.primary }]}>
              Open project
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={palette.primary}
            />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  heading: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    marginBottom: 4,
  },
  sub: {
    fontSize: typography.size.xs,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  cardAddress: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  cardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cardPercent: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    minWidth: 56,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  cardCta: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    marginRight: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.md,
  },
  emptyBody: {
    fontSize: typography.size.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
