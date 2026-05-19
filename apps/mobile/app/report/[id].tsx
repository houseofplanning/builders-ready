import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { spacing, typography, radius, formatDate } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { getSignedUrl } from '../../lib/signed-url';
import {
  getReport,
  acknowledgeReport,
  type ReportDetail,
} from '../../lib/reports';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role, palette, user_id } = useTenant();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setReport(await getReport(id));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onAcknowledge() {
    if (!report || !user_id) return;
    setAcking(true);
    try {
      await acknowledgeReport({
        report_id: report.id,
        acknowledged_by: user_id,
      });
      await load();
    } catch (err) {
      Alert.alert(
        'Could not acknowledge',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setAcking(false);
    }
  }

  async function onOpenPdf() {
    if (!report?.pdf_storage_path) return;
    const url = await getSignedUrl('reports', report.pdf_storage_path);
    if (!url) {
      Alert.alert('Could not open PDF', 'Storage URL could not be generated.');
      return;
    }
    Linking.openURL(url);
  }

  if (loading || !report) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const isClient = role === 'client';
  const canAck = isClient && !report.acknowledged_at;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: palette.canvas }]}
      edges={['top', 'bottom']}
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
          Report
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: canAck ? 120 : spacing.xxl }}>
        <View style={styles.hero}>
          {report.acknowledged_at ? (
            <View style={[styles.pill, { backgroundColor: palette.successSoft }]}>
              <Ionicons name="checkmark-circle" size={14} color={palette.success} />
              <Text style={[styles.pillText, { color: palette.success }]}>
                Acknowledged{report.acknowledged_at && ` · ${formatDate(report.acknowledged_at)}`}
                {report.acknowledged_by_profile &&
                  ` · ${report.acknowledged_by_profile.full_name}`}
              </Text>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: palette.accentSoft }]}>
              <Text style={[styles.pillText, { color: palette.accentDeep }]}>
                {isClient ? 'New — tap acknowledge below' : 'Awaiting client acknowledgement'}
              </Text>
            </View>
          )}

          <Text style={[styles.title, { color: palette.ink }]}>
            {report.title}
          </Text>
          <Text style={[styles.meta, { color: palette.inkMuted }]}>
            Posted by {report.posted_by_profile.full_name} ·{' '}
            {formatDate(report.posted_at)}
          </Text>
        </View>

        {report.kind === 'pdf' ? (
          <View
            style={[
              styles.pdfCard,
              { backgroundColor: palette.card, borderColor: palette.hairline },
            ]}
          >
            <View
              style={[
                styles.pdfIconCircle,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <Ionicons
                name="document-attach"
                size={28}
                color={palette.primary}
              />
            </View>
            <Text style={[styles.pdfTitle, { color: palette.ink }]}>
              PDF report
            </Text>
            <Text style={[styles.pdfHint, { color: palette.inkMuted }]}>
              Opens in your phone&apos;s PDF viewer.
            </Text>
            <TouchableOpacity
              onPress={onOpenPdf}
              activeOpacity={0.85}
              style={[styles.openBtn, { backgroundColor: palette.primary }]}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.openBtnText}>Open PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sections}>
            <ReportSection label="Summary" value={report.summary} palette={palette} />
            <ReportSection label="Look-ahead — next week" value={report.next_week} palette={palette} />
            <ReportSection label="Risks" value={report.risks} palette={palette} />
            <ReportSection label="Decisions needed" value={report.decisions_needed} palette={palette} />
          </View>
        )}
      </ScrollView>

      {canAck && (
        <View
          style={[
            styles.footer,
            { backgroundColor: palette.card, borderTopColor: palette.hairline },
          ]}
        >
          <TouchableOpacity
            onPress={onAcknowledge}
            disabled={acking}
            activeOpacity={0.85}
            style={[
              styles.ackBtn,
              { backgroundColor: acking ? palette.inkMuted : palette.primary },
            ]}
          >
            {acking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.ackBtnText}>I&apos;ve read this</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function ReportSection({
  label,
  value,
  palette,
}: {
  label: string;
  value: string | null;
  palette: ReturnType<typeof useTenant>['palette'];
}) {
  if (!value || !value.trim()) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text style={[styles.sectionBody, { color: palette.ink }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  pillText: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  pdfCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  pdfIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pdfTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  pdfHint: {
    fontSize: typography.size.sm,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  openBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  sections: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  ackBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
