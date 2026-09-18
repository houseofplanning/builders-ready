import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  gbp,
  formatDate,
  marginPercent,
  ESTIMATE_LINE_KIND_LABELS,
  VAT_MODE_NOTE,
} from '@br/shared';
import type { EstimateStatus } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import {
  getEstimate,
  deleteEstimate,
  sendEstimate,
  type EstimateWithLines,
} from '../../lib/estimates';

function statusStyle(
  status: EstimateStatus,
  palette: ReturnType<typeof useTenant>['palette'],
): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'sent':
      return { label: 'Sent', bg: palette.infoSoft, fg: palette.info };
    case 'accepted':
      return { label: 'Accepted', bg: palette.successSoft, fg: palette.success };
    case 'declined':
      return { label: 'Declined', bg: palette.errorSoft, fg: palette.error };
    case 'expired':
      return { label: 'Expired', bg: palette.canvas, fg: palette.inkMuted };
    case 'draft':
    default:
      return { label: 'Draft', bg: palette.canvas, fg: palette.inkMuted };
  }
}

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tenant, role, palette } = useTenant();

  const [estimate, setEstimate] = useState<EstimateWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setEstimate(await getEstimate(id));
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !estimate) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const s = statusStyle(estimate.status, palette);
  const isDraft = estimate.status === 'draft';
  const canManage = role === 'owner' || role === 'pm';
  const vatNote = VAT_MODE_NOTE[estimate.vat_mode];
  const site = [
    estimate.site_address_line1,
    estimate.city,
    estimate.postcode,
  ]
    .filter(Boolean)
    .join(', ');

  async function onSend() {
    if (!estimate) return;
    setSending(true);
    try {
      const { url } = await sendEstimate(estimate.id, estimate.accept_token);
      await load();
      await Share.share({
        message: `${estimate.title} — here's your quote from ${
          tenant?.name ?? 'us'
        }: ${url}`,
      });
    } catch (err) {
      Alert.alert(
        'Could not send',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSending(false);
    }
  }

  function onDelete() {
    Alert.alert(
      'Delete this quote?',
      'This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!estimate) return;
            setWorking(true);
            try {
              await deleteEstimate(estimate.id);
              router.back();
            } catch (err) {
              Alert.alert(
                'Could not delete',
                err instanceof Error ? err.message : 'Unknown error',
              );
              setWorking(false);
            }
          },
        },
      ],
    );
  }

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
          {estimate.number}
        </Text>
        {canManage && isDraft ? (
          <TouchableOpacity
            onPress={() => router.push(`/create-estimate?id=${estimate.id}`)}
            hitSlop={10}
          >
            <Text
              style={{
                color: palette.primary,
                fontWeight: typography.weightBold as '700',
                fontSize: typography.size.body,
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.pill, { backgroundColor: s.bg }]}>
          <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
        </View>
        <Text style={[styles.title, { color: palette.ink }]}>{estimate.title}</Text>
        <Text style={[styles.client, { color: palette.inkMuted }]}>
          {estimate.client_name}
          {site ? ` · ${site}` : ''}
        </Text>

        {/* LINES */}
        <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
          Cost build-up
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          {estimate.lines.length === 0 ? (
            <Text style={{ color: palette.inkMuted }}>No lines.</Text>
          ) : (
            estimate.lines.map((l, i) => (
              <View
                key={l.id}
                style={[
                  styles.lineRow,
                  i < estimate.lines.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.hairline,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={[styles.lineDesc, { color: palette.ink }]}>
                    {l.description}
                  </Text>
                  <Text style={[styles.lineMeta, { color: palette.inkMuted }]}>
                    {ESTIMATE_LINE_KIND_LABELS[l.kind]} · {l.quantity} {l.unit}
                    {l.markup_percent > 0 ? ` · +${l.markup_percent}%` : ''}
                  </Text>
                </View>
                <Text style={[styles.linePrice, { color: palette.ink }]}>
                  {gbp(l.line_price_pence)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* TOTALS */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <TotalRow label="Subtotal" value={gbp(estimate.subtotal_pence)} palette={palette} />
          {estimate.vat_mode === 'standard' && (
            <TotalRow label="VAT (20%)" value={gbp(estimate.vat_pence)} palette={palette} />
          )}
          <View style={[styles.divider, { backgroundColor: palette.hairline }]} />
          <TotalRow
            label="Total"
            value={gbp(estimate.total_pence)}
            palette={palette}
            strong
          />
          {canManage && (
            <Text style={[styles.marginNote, { color: palette.inkMuted }]}>
              Your margin: {gbp(estimate.subtotal_pence - estimate.cost_subtotal_pence)} (
              {Math.round(
                marginPercent({
                  cost_subtotal_pence: estimate.cost_subtotal_pence,
                  subtotal_pence: estimate.subtotal_pence,
                  vat_pence: estimate.vat_pence,
                  total_pence: estimate.total_pence,
                  margin_pence: estimate.subtotal_pence - estimate.cost_subtotal_pence,
                }),
              )}
              %)
            </Text>
          )}
        </View>

        {vatNote && (
          <Text style={[styles.vatNote, { color: palette.inkMuted }]}>{vatNote}</Text>
        )}

        {estimate.notes && (
          <>
            <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
              Notes
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.hairline },
              ]}
            >
              <Text style={[styles.notes, { color: palette.ink }]}>
                {estimate.notes}
              </Text>
            </View>
          </>
        )}

        {estimate.valid_until && (
          <Text style={[styles.valid, { color: palette.inkMuted }]}>
            Valid until {formatDate(estimate.valid_until)}
          </Text>
        )}

        {/* SEND & SHARE */}
        {canManage && estimate.status !== 'accepted' && (
          <>
            <TouchableOpacity
              onPress={onSend}
              disabled={sending}
              activeOpacity={0.85}
              style={[
                styles.sendBtn,
                { backgroundColor: sending ? palette.inkMuted : palette.primary },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={17}
                    color="#fff"
                  />
                  <Text style={styles.sendText}>
                    {estimate.accept_token
                      ? 'Share quote link'
                      : 'Send & share quote'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {estimate.accept_token && (
              <Text
                style={[styles.linkText, { color: palette.inkMuted }]}
                selectable
              >
                buildersready.uk/q/{estimate.accept_token}
              </Text>
            )}
          </>
        )}

        {canManage && (
          <View
            style={[
              styles.nextCard,
              { backgroundColor: palette.primarySoft, borderColor: palette.primary },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={palette.primary}
            />
            <Text style={[styles.nextText, { color: palette.ink }]}>
              Sharing sends your client a link they can open with no account,
              where they can accept and sign. The branded PDF, client email, and
              converting a won quote into a project are all on the web admin.
            </Text>
          </View>
        )}

        {canManage && isDraft && (
          <TouchableOpacity
            onPress={onDelete}
            disabled={working}
            activeOpacity={0.8}
            style={[styles.deleteBtn, { borderColor: palette.error }]}
          >
            <Ionicons name="trash-outline" size={16} color={palette.error} />
            <Text style={[styles.deleteText, { color: palette.error }]}>
              Delete draft
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TotalRow({
  label,
  value,
  palette,
  strong,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useTenant>['palette'];
  strong?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text
        style={[
          styles.totalLabel,
          {
            color: strong ? palette.ink : palette.inkMuted,
            fontWeight: (strong
              ? typography.weightExtraBold
              : typography.weightSemibold) as '600',
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.totalValue,
          {
            color: palette.ink,
            fontSize: strong ? typography.size.xl : typography.size.body,
            fontWeight: (strong
              ? typography.weightExtraBold
              : typography.weightBold) as '700',
          },
        ]}
      >
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 1,
  },
  scroll: { padding: spacing.lg },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
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
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.2,
  },
  client: {
    fontSize: typography.size.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  lineDesc: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  lineMeta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  linePrice: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.size.body,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalValue: { letterSpacing: -0.5 },
  divider: { height: 1, marginVertical: spacing.sm },
  marginNote: {
    fontSize: typography.size.xs,
    marginTop: spacing.sm,
  },
  vatNote: {
    fontSize: typography.size.xs,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  notes: {
    fontSize: typography.size.body,
    lineHeight: 22,
  },
  valid: {
    fontSize: typography.size.xs,
    marginTop: spacing.md,
  },
  nextCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  nextText: {
    flex: 1,
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  sendText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  linkText: {
    fontSize: typography.size.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  deleteText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
