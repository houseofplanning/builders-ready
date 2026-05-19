import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, gbp, formatDate } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import type { InvoiceListItem } from '../lib/invoices';

interface Props {
  invoice: InvoiceListItem;
  onPress: () => void;
}

export function InvoiceCard({ invoice, onPress }: Props) {
  const { palette } = useTenant();

  const styleByStatus = (() => {
    if (invoice.isOverdueVisual)
      return { label: 'Overdue', bg: palette.errorSoft, fg: palette.error };
    if (invoice.status === 'paid')
      return { label: 'Paid', bg: palette.successSoft, fg: palette.success };
    if (invoice.status === 'sent')
      return { label: 'Outstanding', bg: palette.infoSoft, fg: palette.info };
    if (invoice.status === 'overdue')
      return { label: 'Overdue', bg: palette.errorSoft, fg: palette.error };
    if (invoice.status === 'cancelled')
      return { label: 'Cancelled', bg: '#EDF0F2', fg: palette.inkMuted };
    return { label: 'Draft', bg: '#EDF0F2', fg: palette.inkMuted };
  })();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: invoice.isOverdueVisual ? palette.error : palette.hairline,
          borderLeftWidth: invoice.isOverdueVisual ? 4 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.number, { color: palette.inkMuted }]}>
          {invoice.number}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: styleByStatus.bg }]}>
          <Text style={[styles.statusText, { color: styleByStatus.fg }]}>
            {styleByStatus.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>
        {invoice.title}
      </Text>

      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: palette.ink }]}>
          {gbp(invoice.amount_gbp_pence)}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.inkMuted}
          style={{ marginLeft: spacing.xs }}
        />
      </View>

      <Text style={[styles.meta, { color: palette.inkMuted }]}>
        Issued {formatDate(invoice.issued_at, { short: true })}
        {'  ·  '}
        Due {formatDate(invoice.due_at, { short: true })}
      </Text>
      {invoice.status === 'paid' && invoice.paid_at && (
        <Text style={[styles.metaPaid, { color: palette.success }]}>
          Paid {formatDate(invoice.paid_at, { short: true })}
          {invoice.paid_reference && `  ·  ref ${invoice.paid_reference}`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  number: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 1,
    fontFamily: 'ui-monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    lineHeight: 22,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  amount: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  metaPaid: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    marginTop: 2,
  },
});
