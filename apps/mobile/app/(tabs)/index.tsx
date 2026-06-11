import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  formatDate,
  gbp,
} from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import { getHandoverSignedUrl } from '../../lib/handover';
import { ProjectPickerButton } from '../../components/project-picker-button';
import { ProjectGrid } from '../../components/project-grid';
import { StagePill, ProjectStatusPill } from '../../components/stage-pill';
import { ProgressBar } from '../../components/progress-bar';

export default function HomeScreen() {
  const { tenant, role, palette } = useTenant();
  const {
    current,
    projects,
    selectedId,
    loading,
    refresh,
    clearSelection,
  } = useCurrentProject();

  // Re-fetch when the tab regains focus (so progress reflects status changes
  // made from Timeline tab).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!tenant) {
    return (
      <EmptyState
        title="No tenant yet"
        body="Your account isn't linked to a builder yet. Ask them to invite you."
      />
    );
  }

  if (projects.length === 0 && !loading) {
    return (
      <EmptyState
        title="No projects yet"
        body={
          role === 'client'
            ? "Your builder hasn't set up a project for you yet."
            : 'Create your first project from the web admin at app.buildersready.uk.'
        }
      />
    );
  }

  // No project selected → show the grid picker. The provider auto-selects
  // when there's exactly one project, so this only fires for owners/PMs
  // with multiple projects (or after a back-to-grid tap).
  if (!selectedId) {
    return <ProjectGrid />;
  }

  if (!current) {
    return (
      <View style={[styles.center, { backgroundColor: palette.canvas }]}>
        <Text style={{ color: palette.inkMuted }}>Loading project…</Text>
      </View>
    );
  }

  // Show the back-to-grid affordance only when the grid is actually a
  // meaningful destination — i.e. multiple projects exist. Clients with
  // a single project never see this.
  const showBackToGrid = projects.length > 1;

  const { project, currentStage, finance } = current;
  const variations = Number(finance.variations_pence ?? 0);
  const invoiced = Number(finance.invoiced_pence ?? 0);
  const paid = Number(finance.paid_pence ?? 0);
  const outstanding = invoiced - paid;

  return (
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      {showBackToGrid ? (
        <TouchableOpacity
          onPress={clearSelection}
          activeOpacity={0.7}
          hitSlop={10}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={18} color={palette.primary} />
          <Text style={[styles.backLabel, { color: palette.primary }]}>
            All projects
          </Text>
        </TouchableOpacity>
      ) : (
        <ProjectPickerButton />
      )}

      <Text style={[styles.projectName, { color: palette.ink }]}>
        {project.name}
      </Text>

      {/* PROJECT HEADER CARD */}
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.hairline },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.address, { color: palette.inkMuted }]}>
              {project.address_line1}
              {project.address_line2 ? `, ${project.address_line2}` : ''}
            </Text>
            <Text style={[styles.address, { color: palette.inkMuted }]}>
              {project.city} · {project.postcode}
            </Text>
          </View>
          <ProjectStatusPill status={project.status} />
        </View>

        <View style={styles.progressRow}>
          <Text style={[styles.progressPercent, { color: palette.ink }]}>
            {project.progress_percent}%
          </Text>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <ProgressBar percent={project.progress_percent} height={10} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta
            label="Started"
            value={formatDate(project.start_date, { short: true })}
            palette={palette}
          />
          <Meta
            label={project.actual_end_date ? 'Completed' : 'Due'}
            value={formatDate(
              project.actual_end_date ?? project.estimated_end_date,
              { short: true },
            )}
            palette={palette}
          />
          <Meta
            label="Open decisions"
            value={String(finance.open_decisions ?? 0)}
            palette={palette}
          />
        </View>
      </View>

      {/* CURRENT STAGE CARD */}
      {currentStage && (
        <View
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <Text style={[styles.cardLabel, { color: palette.inkMuted }]}>
            Current stage
          </Text>
          <View style={styles.stageRow}>
            <Text style={[styles.stageName, { color: palette.ink }]}>
              {currentStage.name}
            </Text>
            <StagePill status={currentStage.status} />
          </View>
          {currentStage.pm_commentary && (
            <Text
              style={[styles.commentary, { color: palette.inkMuted }]}
            >
              {currentStage.pm_commentary}
            </Text>
          )}
          <Text style={[styles.stageDates, { color: palette.inkMuted }]}>
            {formatDate(currentStage.start_date, { short: true })} →{' '}
            {formatDate(currentStage.target_end_date, { short: true })}
          </Text>
        </View>
      )}

      {/* FINANCE SUMMARY — differentiator #3 */}
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>
        Project finance
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.hairline },
        ]}
      >
        <FinanceRow
          label="Variations"
          value={gbp(variations, { whole: variations === 0 })}
          palette={palette}
        />
        <Divider palette={palette} />
        <FinanceRow
          label="Invoiced to date"
          value={gbp(invoiced, { whole: invoiced === 0 })}
          palette={palette}
        />
        <Divider palette={palette} />
        <FinanceRow
          label="Paid"
          value={gbp(paid, { whole: paid === 0 })}
          palette={palette}
        />
        <Divider palette={palette} />
        <FinanceRow
          label="Outstanding"
          value={gbp(outstanding, { whole: outstanding === 0 })}
          palette={palette}
          highlight
        />
      </View>

      {/* PM CONTACT */}
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>
        Your project manager
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.hairline },
        ]}
      >
        <View style={styles.pmRow}>
          <View
            style={[
              styles.pmAvatar,
              { backgroundColor: palette.primarySoft, borderColor: palette.primary },
            ]}
          >
            <Ionicons
              name="person"
              size={20}
              color={palette.primary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[styles.pmName, { color: palette.ink }]}>
              {project.pm?.full_name ?? 'PM'}
            </Text>
            <Text style={[styles.pmRole, { color: palette.inkMuted }]}>
              Project Manager
            </Text>
          </View>
        </View>
        {project.pm?.email && (
          <ContactRow
            icon="mail-outline"
            label={project.pm.email}
            onPress={() => Linking.openURL(`mailto:${project.pm.email}`)}
            palette={palette}
          />
        )}
        {project.pm?.phone && (
          <ContactRow
            icon="call-outline"
            label={project.pm.phone}
            onPress={() => Linking.openURL(`tel:${project.pm.phone}`)}
            palette={palette}
          />
        )}
      </View>

      {/* HANDOVER PDF
          Always render the card so clients understand the deliverable
          exists. If the builder hasn't generated the PDF yet, show a
          state-aware placeholder; once generated, the same card becomes
          the download CTA. PDF generation itself is web-only (it's a
          heavy server-side render). */}
      <Text style={[styles.sectionTitle, { color: palette.ink }]}>
        Project handover
      </Text>
      {project.handover_pdf_storage_path ? (
        <TouchableOpacity
          onPress={async () => {
            const url = await getHandoverSignedUrl(
              project.handover_pdf_storage_path!,
            );
            if (url) Linking.openURL(url);
          }}
          activeOpacity={0.7}
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.primary,
              borderWidth: 1.5,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: palette.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="document-text"
              size={22}
              color={palette.primary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: typography.size.body,
                fontWeight: typography.weightExtraBold as '800',
                color: palette.ink,
              }}
            >
              Download handover PDF
            </Text>
            <Text
              style={{
                fontSize: typography.size.xs,
                color: palette.inkMuted,
                marginTop: 2,
              }}
            >
              Quote, variations, timeline, updates, decisions, invoices — one document
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.inkMuted}
          />
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.hairline,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: 0.85,
            },
          ]}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: palette.canvas,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="document-text-outline"
              size={22}
              color={palette.inkMuted}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: typography.size.body,
                fontWeight: typography.weightExtraBold as '800',
                color: palette.ink,
              }}
            >
              Available at handover
            </Text>
            <Text
              style={{
                fontSize: typography.size.xs,
                color: palette.inkMuted,
                marginTop: 2,
                lineHeight: 18,
              }}
            >
              {role === 'client'
                ? 'Your builder will generate a complete project record at the end of the job — quote, variations, timeline, every update, decisions and invoices in one PDF you keep for life.'
                : 'Generate the handover PDF from the web admin (app.buildersready.uk) once the project is complete. Clients can download it from here.'}
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

// ---------- subcomponents ----------

interface PaletteProp {
  palette: ReturnType<typeof useTenant>['palette'];
}

function Meta({
  label,
  value,
  palette,
}: { label: string; value: string } & PaletteProp) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.metaLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text style={[styles.metaValue, { color: palette.ink }]}>{value}</Text>
    </View>
  );
}

function FinanceRow({
  label,
  value,
  palette,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
} & PaletteProp) {
  return (
    <View style={styles.financeRow}>
      <Text
        style={[
          styles.financeLabel,
          {
            color: highlight ? palette.ink : palette.inkMuted,
            fontWeight: highlight
              ? typography.weightBold
              : typography.weightSemibold,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.financeValue,
          {
            color: highlight ? palette.accentDeep : palette.ink,
            fontWeight: highlight
              ? typography.weightExtraBold
              : typography.weightBold,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ palette }: PaletteProp) {
  return (
    <View style={[styles.divider, { backgroundColor: palette.hairline }]} />
  );
}

function ContactRow({
  icon,
  label,
  onPress,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
} & PaletteProp) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.contactRow}
    >
      <Ionicons name={icon} size={16} color={palette.primary} />
      <Text style={[styles.contactLabel, { color: palette.primary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
    marginLeft: 2,
  },
  projectName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  emptyBody: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: '#5F7480',
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  address: {
    fontSize: typography.size.sm,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressPercent: {
    fontSize: typography.size.display,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -1,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  metaLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  metaValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    marginTop: 2,
  },
  cardLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    flex: 1,
    marginRight: spacing.sm,
  },
  commentary: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  stageDates: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: typography.weightSemibold as '600',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  financeRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: typography.size.body,
    flex: 1,
  },
  financeValue: {
    fontSize: typography.size.body,
  },
  divider: {
    height: 1,
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pmName: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  pmRole: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
    fontWeight: typography.weightSemibold as '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  contactLabel: {
    fontSize: typography.size.body,
    marginLeft: spacing.sm,
    fontWeight: typography.weightSemibold as '600',
  },
});
