import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  spacing,
  typography,
  radius,
  formatDate,
  gbp,
} from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import {
  getInvoice,
  markInvoicePaid,
  type InvoiceDetail,
} from '../../lib/invoices';

function isVisuallyOverdue(invoice: InvoiceDetail): boolean {
  if (invoice.status !== 'sent') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.due_at + 'T00:00:00');
  return due.getTime() < today.getTime();
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tenant, role, palette, user_id } = useTenant();
  const { refresh: refreshProject } = useCurrentProject();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const i = await getInvoice(id);
    setInvoice(i);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !invoice || !tenant) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.canvas }]}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  const overdue = isVisuallyOverdue(invoice);
  const isPaid = invoice.status === 'paid';
  const canMarkPaid =
    invoice.status === 'sent' || invoice.status === 'overdue';

  // Suggested transfer reference if the client doesn't have their own:
  // tenant business prefix + invoice number, e.g. "REGAL INV-2026-003"
  const suggestedRef = `${tenant.name.split(/\s+/)[0]?.toUpperCase() || 'REF'} ${invoice.number}`;

  const bankReady =
    !!tenant.bank_account_name &&
    !!tenant.bank_sort_code &&
    !!tenant.bank_account_number;

  async function onMarkPaid() {
    if (!invoice || !user_id) return;
    Alert.alert(
      'Mark this invoice as paid?',
      'Your builder will be notified and the invoice will move to the Paid section. Make sure you’ve actually sent the bank transfer first.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, mark paid',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await markInvoicePaid({
                invoice_id: invoice.id,
                paid_reference: reference,
                paid_marked_by: user_id,
              });
              await refreshProject();
              router.back();
            } catch (err) {
              Alert.alert(
                'Could not mark as paid',
                err instanceof Error ? err.message : 'Unknown error',
              );
            } finally {
              setSubmitting(false);
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
          {invoice.number}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: canMarkPaid && role === 'client' ? 120 : spacing.xl }}>
          {/* STATUS BANNER */}
          <View style={styles.statusSection}>
            {isPaid ? (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.successSoft },
                ]}
              >
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <Text style={[styles.statusLabel, { color: palette.success }]}>
                  Paid · {invoice.paid_at && formatDate(invoice.paid_at)}
                </Text>
              </View>
            ) : overdue ? (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.errorSoft },
                ]}
              >
                <Ionicons name="alert-circle" size={14} color={palette.error} />
                <Text style={[styles.statusLabel, { color: palette.error }]}>
                  Overdue · was due {formatDate(invoice.due_at)}
                </Text>
              </View>
            ) : invoice.status === 'sent' ? (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.infoSoft },
                ]}
              >
                <Text style={[styles.statusLabel, { color: palette.info }]}>
                  Awaiting payment · due {formatDate(invoice.due_at)}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.title, { color: palette.ink }]}>
              {invoice.title}
            </Text>
            <Text style={[styles.amount, { color: palette.ink }]}>
              {gbp(invoice.amount_gbp_pence)}
            </Text>
            {invoice.description && (
              <Text style={[styles.description, { color: palette.inkMuted }]}>
                {invoice.description}
              </Text>
            )}

            <Text style={[styles.meta, { color: palette.inkMuted }]}>
              Issued {formatDate(invoice.issued_at)} by{' '}
              {invoice.created_by_profile.full_name}
              {'  ·  '}
              Due {formatDate(invoice.due_at)}
            </Text>
          </View>

          {/* PAID AUDIT (if paid) */}
          {isPaid && (
            <View
              style={[
                styles.paidBox,
                { backgroundColor: palette.card, borderColor: palette.success },
              ]}
            >
              <Text style={[styles.paidLabel, { color: palette.inkMuted }]}>
                Marked paid
              </Text>
              {invoice.paid_marked_by_profile && (
                <Text style={[styles.paidName, { color: palette.ink }]}>
                  by {invoice.paid_marked_by_profile.full_name}
                </Text>
              )}
              {invoice.paid_at && (
                <Text style={[styles.paidMeta, { color: palette.inkMuted }]}>
                  {formatDate(invoice.paid_at)} ·{' '}
                  {new Date(invoice.paid_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
              {invoice.paid_reference && (
                <Text style={[styles.paidRef, { color: palette.ink }]}>
                  Reference: {invoice.paid_reference}
                </Text>
              )}
            </View>
          )}

          {/* BANK DETAILS (shown to anyone, useful for everyone) */}
          {!isPaid && (
            <>
              <Text style={[styles.sectionLabel, { color: palette.inkMuted }]}>
                Pay by bank transfer
              </Text>
              <View
                style={[
                  styles.bankCard,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                {bankReady ? (
                  <>
                    <BankRow
                      label="Account name"
                      value={tenant.bank_account_name ?? '—'}
                      palette={palette}
                    />
                    <BankRow
                      label="Sort code"
                      value={tenant.bank_sort_code ?? '—'}
                      mono
                      palette={palette}
                    />
                    <BankRow
                      label="Account number"
                      value={tenant.bank_account_number ?? '—'}
                      mono
                      palette={palette}
                    />
                    {tenant.bank_name && (
                      <BankRow
                        label="Bank"
                        value={tenant.bank_name}
                        palette={palette}
                      />
                    )}
                    <BankRow
                      label="Suggested reference"
                      value={suggestedRef}
                      mono
                      palette={palette}
                      hint="Quote this so your builder can match the payment fast"
                    />
                    {tenant.vat_number && (
                      <BankRow
                        label="VAT number"
                        value={tenant.vat_number}
                        palette={palette}
                      />
                    )}
                    {tenant.company_number && (
                      <BankRow
                        label="Companies House"
                        value={tenant.company_number}
                        palette={palette}
                      />
                    )}
                  </>
                ) : (
                  <Text style={[styles.bankMissing, { color: palette.error }]}>
                    Your builder hasn’t added bank details yet. Contact them
                    directly for payment instructions.
                  </Text>
                )}
              </View>
            </>
          )}

          {/* MARK PAID FORM (client + outstanding) */}
          {canMarkPaid && role === 'client' && (
            <View style={styles.markPaidSection}>
              <Text style={[styles.signTitle, { color: palette.ink }]}>
                Already paid?
              </Text>
              <Text style={[styles.signHint, { color: palette.inkMuted }]}>
                Once your bank transfer has gone through, mark this invoice as
                paid. Optionally add the reference you used so your builder can
                match it up.
              </Text>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder={`Reference (e.g. ${suggestedRef})`}
                placeholderTextColor={palette.inkMuted}
                autoCapitalize="characters"
                style={[
                  styles.field,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: palette.card,
                    color: palette.ink,
                  },
                ]}
              />
            </View>
          )}

          {/* OWNER/PM hint */}
          {canMarkPaid && role !== 'client' && (
            <Text style={[styles.readOnlyHint, { color: palette.inkMuted }]}>
              Only the project&apos;s client can mark this paid. If you&apos;ve
              received the funds directly, ask them to mark it from their app, or
              do it on their behalf via the web admin.
            </Text>
          )}
        </ScrollView>

        {canMarkPaid && role === 'client' && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: palette.card,
                borderTopColor: palette.hairline,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onMarkPaid}
              disabled={submitting}
              activeOpacity={0.85}
              style={[
                styles.payBtn,
                {
                  backgroundColor: submitting
                    ? palette.inkMuted
                    : palette.success,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Mark as paid</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BankRow({
  label,
  value,
  mono,
  hint,
  palette,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
  palette: ReturnType<typeof useTenant>['palette'];
}) {
  return (
    <View style={styles.bankRow}>
      <Text style={[styles.bankLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text
        selectable
        style={[
          styles.bankValue,
          { color: palette.ink },
          mono && { fontFamily: 'ui-monospace', letterSpacing: 1 },
        ]}
      >
        {value}
      </Text>
      {hint && (
        <Text style={[styles.bankHint, { color: palette.inkMuted }]}>
          {hint}
        </Text>
      )}
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
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
    letterSpacing: 1,
  },
  statusSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  amount: {
    fontSize: typography.size.display,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -1.2,
    marginTop: spacing.xs,
  },
  description: {
    fontSize: typography.size.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: spacing.md,
  },
  paidBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  paidLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  paidName: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    marginTop: 2,
  },
  paidMeta: {
    fontSize: typography.size.xs,
    marginTop: 4,
  },
  paidRef: {
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  bankCard: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bankRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  bankLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  bankValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightBold as '700',
    marginTop: 2,
  },
  bankHint: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  bankMissing: {
    fontSize: typography.size.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  markPaidSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  signTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
    marginBottom: 4,
  },
  signHint: {
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  readOnlyHint: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontSize: typography.size.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  payBtnText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
