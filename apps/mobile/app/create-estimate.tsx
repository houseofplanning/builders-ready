import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  spacing,
  typography,
  radius,
  gbp,
  computeEstimateTotals,
  linePricePence,
  marginPercent,
  ESTIMATE_LINE_KIND_LABELS,
  ESTIMATE_LINE_KIND_DEFAULT_UNIT,
  VAT_MODE_LABELS,
} from '@br/shared';
import type { EstimateLineKind, SavedRate, VatMode } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import {
  createEstimate,
  updateEstimate,
  getEstimate,
  listSavedRates,
  type EstimateLineDraft,
} from '../lib/estimates';

const KINDS: EstimateLineKind[] = [
  'material',
  'labour_day_rate',
  'labour_hourly',
  'fixed',
  'other',
];
const VAT_MODES: VatMode[] = ['none', 'standard', 'reverse_charge'];

interface LineRow {
  key: string;
  kind: EstimateLineKind;
  saved_rate_id: string | null;
  description: string;
  quantityText: string;
  unit: string;
  unitCostText: string; // pounds, as typed
  markupText: string; // percent, as typed
}

let keySeq = 0;
function newKey(): string {
  keySeq += 1;
  return `l${keySeq}`;
}

function blankRow(kind: EstimateLineKind = 'material'): LineRow {
  return {
    key: newKey(),
    kind,
    saved_rate_id: null,
    description: '',
    quantityText: '1',
    unit: ESTIMATE_LINE_KIND_DEFAULT_UNIT[kind],
    unitCostText: '',
    markupText: '',
  };
}

function poundsToPence(s: string): number {
  const cleaned = s.replace(/[£,\s]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function num(s: string, fallback = 0): number {
  const n = Number(s.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const VALIDITY_PRESETS: { days: number | null; label: string }[] = [
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: null, label: 'No expiry' },
];

export default function CreateEstimateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { tenant, user_id, palette } = useTenant();

  const [hydrating, setHydrating] = useState<boolean>(!!id);
  const [validityTouched, setValidityTouched] = useState(false);
  const [keepValidUntil, setKeepValidUntil] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [addr1, setAddr1] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');

  const [rows, setRows] = useState<LineRow[]>([blankRow()]);
  const [vatMode, setVatMode] = useState<VatMode>('none');
  const [validityDays, setValidityDays] = useState<number | null>(14);
  const [notes, setNotes] = useState('');

  const [savedRates, setSavedRates] = useState<SavedRate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listSavedRates().then(setSavedRates).catch(() => setSavedRates([]));
  }, []);

  // Edit mode: load the draft and prefill everything.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const est = await getEstimate(id);
      if (cancelled) return;
      if (!est) {
        Alert.alert('Not found', 'This quote could not be loaded.');
        router.back();
        return;
      }
      if (est.status !== 'draft') {
        Alert.alert('Already sent', 'Only draft quotes can be edited.');
        router.replace(`/estimate/${id}`);
        return;
      }
      setTitle(est.title);
      setClientName(est.client_name);
      setClientEmail(est.client_email ?? '');
      setClientPhone(est.client_phone ?? '');
      setAddr1(est.site_address_line1 ?? '');
      setCity(est.city ?? '');
      setPostcode(est.postcode ?? '');
      setVatMode(est.vat_mode);
      setKeepValidUntil(est.valid_until);
      setNotes(est.notes ?? '');
      setRows(
        est.lines.length
          ? est.lines.map((l) => ({
              key: newKey(),
              kind: l.kind,
              saved_rate_id: l.saved_rate_id,
              description: l.description,
              quantityText: String(l.quantity),
              unit: l.unit,
              unitCostText: (l.unit_cost_pence / 100).toString(),
              markupText: l.markup_percent ? String(l.markup_percent) : '',
            }))
          : [blankRow()],
      );
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const totals = useMemo(
    () =>
      computeEstimateTotals(
        rows.map((r) => ({
          quantity: num(r.quantityText, 0),
          unit_cost_pence: poundsToPence(r.unitCostText),
          markup_percent: num(r.markupText, 0),
        })),
        vatMode,
        2000,
      ),
    [rows, vatMode],
  );

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function setRowKind(key: string, kind: EstimateLineKind) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        // Update the unit to the kind default only if the user hasn't set a
        // custom one (i.e. it still matches the previous kind's default).
        const unitWasDefault =
          r.unit === ESTIMATE_LINE_KIND_DEFAULT_UNIT[r.kind] || r.unit === '';
        return {
          ...r,
          kind,
          unit: unitWasDefault ? ESTIMATE_LINE_KIND_DEFAULT_UNIT[kind] : r.unit,
        };
      }),
    );
  }

  function addBlankLine() {
    setRows((prev) => [...prev, blankRow()]);
  }

  function addFromRate(rate: SavedRate) {
    setRows((prev) => [
      ...prev,
      {
        key: newKey(),
        kind: rate.kind,
        saved_rate_id: rate.id,
        description: rate.description,
        quantityText: '1',
        unit: rate.unit,
        unitCostText: (rate.default_unit_cost_pence / 100).toString(),
        markupText: rate.default_markup_percent
          ? rate.default_markup_percent.toString()
          : '',
      },
    ]);
  }

  function removeLine(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  const meaningfulLines = rows.filter(
    (r) => r.description.trim() || poundsToPence(r.unitCostText) > 0,
  );
  const canSave =
    !!clientName.trim() && !!title.trim() && meaningfulLines.length > 0;

  async function onSave() {
    if (!tenant || !user_id) return;
    if (!clientName.trim()) {
      Alert.alert('Who is this for?', 'Add the client or prospect name.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', 'e.g. Loft conversion & rear extension.');
      return;
    }
    const lines: EstimateLineDraft[] = meaningfulLines.map((r) => ({
      kind: r.kind,
      saved_rate_id: r.saved_rate_id,
      description: r.description.trim() || ESTIMATE_LINE_KIND_LABELS[r.kind],
      quantity: num(r.quantityText, 1),
      unit: r.unit.trim() || ESTIMATE_LINE_KIND_DEFAULT_UNIT[r.kind],
      unit_cost_pence: poundsToPence(r.unitCostText),
      markup_percent: num(r.markupText, 0),
    }));
    if (lines.length === 0) {
      Alert.alert('Add at least one line', 'A quote needs something in it.');
      return;
    }
    const validUntil =
      editing && !validityTouched
        ? keepValidUntil
        : validityDays
          ? daysFromNowISO(validityDays)
          : null;
    const input = {
      tenant_id: tenant.id,
      created_by: user_id,
      title: title.trim(),
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || null,
      client_phone: clientPhone.trim() || null,
      site_address_line1: addr1.trim() || null,
      site_address_line2: null,
      city: city.trim() || null,
      postcode: postcode.trim() || null,
      vat_mode: vatMode,
      vat_rate_bp: 2000,
      valid_until: validUntil,
      notes: notes.trim() || null,
      terms: null,
      lines,
    };
    setSubmitting(true);
    try {
      if (editing && id) {
        await updateEstimate({ id, ...input });
        router.back(); // return to the detail, which reloads on focus
      } else {
        const newId = await createEstimate(input);
        router.replace(`/estimate/${newId}`);
      }
    } catch (err) {
      Alert.alert(
        'Could not save the quote',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!tenant || !user_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.center}>
          <Text style={{ color: palette.inkMuted }}>Not signed in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hydrating) {
    return (
      <SafeAreaView
        style={[styles.center, { flex: 1, backgroundColor: palette.canvas }]}
      >
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
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
          <Text style={[styles.cancel, { color: palette.inkMuted }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>
          {editing ? 'Edit quote' : 'New quote'}
        </Text>
        <View style={{ width: 52 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* TITLE */}
          <Text style={[styles.label, { color: palette.inkMuted }]}>
            What&apos;s the job?
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Loft conversion & rear extension"
            placeholderTextColor={palette.inkMuted}
            style={field(palette)}
          />

          {/* CLIENT / SITE */}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>
            Client &amp; site
          </Text>
          <TextInput
            value={clientName}
            onChangeText={setClientName}
            placeholder="Client / prospect name"
            placeholderTextColor={palette.inkMuted}
            style={field(palette)}
          />
          <View style={styles.row2}>
            <TextInput
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="Email (optional)"
              placeholderTextColor={palette.inkMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[field(palette), styles.rowItem]}
            />
            <TextInput
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Phone (optional)"
              placeholderTextColor={palette.inkMuted}
              keyboardType="phone-pad"
              style={[field(palette), styles.rowItem]}
            />
          </View>
          <TextInput
            value={addr1}
            onChangeText={setAddr1}
            placeholder="Site address (optional)"
            placeholderTextColor={palette.inkMuted}
            style={field(palette)}
          />
          <View style={styles.row2}>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Town / city"
              placeholderTextColor={palette.inkMuted}
              style={[field(palette), styles.rowItem]}
            />
            <TextInput
              value={postcode}
              onChangeText={setPostcode}
              placeholder="Postcode"
              placeholderTextColor={palette.inkMuted}
              autoCapitalize="characters"
              style={[field(palette), styles.rowItem]}
            />
          </View>

          {/* LINE ITEMS */}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>
            Cost build-up
          </Text>
          <Text style={[styles.help, { color: palette.inkMuted }]}>
            Enter your cost per unit and a markup %. The client price is worked
            out for you.
          </Text>

          {rows.map((r, idx) => {
            const preview = linePricePence({
              quantity: num(r.quantityText, 0),
              unit_cost_pence: poundsToPence(r.unitCostText),
              markup_percent: num(r.markupText, 0),
            });
            return (
              <View
                key={r.key}
                style={[
                  styles.lineCard,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                <View style={styles.lineHeaderRow}>
                  <Text style={[styles.lineIndex, { color: palette.inkMuted }]}>
                    Line {idx + 1}
                  </Text>
                  {rows.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLine(r.key)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={palette.error}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* kind chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {KINDS.map((k) => {
                    const active = r.kind === k;
                    return (
                      <TouchableOpacity
                        key={k}
                        onPress={() => setRowKind(r.key, k)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? palette.primary : palette.canvas,
                            borderColor: active ? palette.primary : palette.hairline,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: active ? '#fff' : palette.ink },
                          ]}
                        >
                          {ESTIMATE_LINE_KIND_LABELS[k]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput
                  value={r.description}
                  onChangeText={(t) => updateRow(r.key, { description: t })}
                  placeholder="Description"
                  placeholderTextColor={palette.inkMuted}
                  style={[field(palette), { marginTop: spacing.sm }]}
                />

                <View style={styles.row3}>
                  <View style={styles.miniField}>
                    <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                      Qty
                    </Text>
                    <TextInput
                      value={r.quantityText}
                      onChangeText={(t) =>
                        updateRow(r.key, { quantityText: t.replace(/[^0-9.]/g, '') })
                      }
                      keyboardType="decimal-pad"
                      style={field(palette)}
                    />
                  </View>
                  <View style={styles.miniField}>
                    <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                      Unit
                    </Text>
                    <TextInput
                      value={r.unit}
                      onChangeText={(t) => updateRow(r.key, { unit: t })}
                      placeholder="each"
                      placeholderTextColor={palette.inkMuted}
                      style={field(palette)}
                    />
                  </View>
                </View>

                <View style={styles.row3}>
                  <View style={styles.miniField}>
                    <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                      Your cost (£/unit)
                    </Text>
                    <TextInput
                      value={r.unitCostText}
                      onChangeText={(t) =>
                        updateRow(r.key, { unitCostText: t.replace(/[^0-9.]/g, '') })
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={palette.inkMuted}
                      style={field(palette)}
                    />
                  </View>
                  <View style={styles.miniField}>
                    <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                      Markup %
                    </Text>
                    <TextInput
                      value={r.markupText}
                      onChangeText={(t) =>
                        updateRow(r.key, { markupText: t.replace(/[^0-9.]/g, '') })
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={palette.inkMuted}
                      style={field(palette)}
                    />
                  </View>
                </View>

                <View style={styles.linePriceRow}>
                  <Text style={[styles.linePriceLabel, { color: palette.inkMuted }]}>
                    Client price
                  </Text>
                  <Text style={[styles.linePriceValue, { color: palette.ink }]}>
                    {gbp(preview)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* add line */}
          <TouchableOpacity
            onPress={addBlankLine}
            activeOpacity={0.7}
            style={[styles.addLine, { borderColor: palette.primary }]}
          >
            <Ionicons name="add" size={18} color={palette.primary} />
            <Text style={[styles.addLineText, { color: palette.primary }]}>
              Add a line
            </Text>
          </TouchableOpacity>

          {/* saved rates */}
          {savedRates.length > 0 && (
            <>
              <Text style={[styles.help, { color: palette.inkMuted, marginTop: spacing.md }]}>
                Or pull one in from your saved rates — you can still change any
                figure:
              </Text>
              <View style={styles.rateWrap}>
                {savedRates.map((rate) => (
                  <TouchableOpacity
                    key={rate.id}
                    onPress={() => addFromRate(rate)}
                    activeOpacity={0.7}
                    style={[
                      styles.rateChip,
                      { backgroundColor: palette.card, borderColor: palette.hairline },
                    ]}
                  >
                    <Text style={[styles.rateChipText, { color: palette.ink }]} numberOfLines={1}>
                      {rate.description}
                    </Text>
                    <Text style={[styles.rateChipMeta, { color: palette.inkMuted }]}>
                      {gbp(rate.default_unit_cost_pence)}/{rate.unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* VAT */}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>VAT</Text>
          <View style={styles.chipWrap}>
            {VAT_MODES.map((m) => {
              const active = vatMode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setVatMode(m)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#fff' : palette.ink },
                    ]}
                  >
                    {VAT_MODE_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {vatMode === 'standard' && (
            <Text style={[styles.help, { color: palette.inkMuted }]}>
              Standard VAT at 20% is added to the total.
            </Text>
          )}
          {vatMode === 'reverse_charge' && (
            <Text style={[styles.help, { color: palette.inkMuted }]}>
              CIS domestic reverse charge — no VAT added; the customer accounts
              for it.
            </Text>
          )}

          {/* validity */}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>
            Quote valid for
          </Text>
          <View style={styles.chipWrap}>
            {VALIDITY_PRESETS.map((p) => {
              const active = validityDays === p.days;
              return (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => {
                    setValidityDays(p.days);
                    setValidityTouched(true);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#fff' : palette.ink },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* notes */}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>
            Notes for the client (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Anything that isn't a priced line — assumptions, exclusions, access notes…"
            placeholderTextColor={palette.inkMuted}
            style={[field(palette), styles.textarea]}
          />

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* STICKY TOTALS + SAVE */}
        <View
          style={[
            styles.footer,
            { backgroundColor: palette.card, borderTopColor: palette.hairline },
          ]}
        >
          <View style={styles.totalsGrid}>
            <TotalCell label="Subtotal" value={gbp(totals.subtotal_pence)} palette={palette} />
            <TotalCell
              label={vatMode === 'standard' ? 'VAT (20%)' : 'VAT'}
              value={gbp(totals.vat_pence)}
              palette={palette}
            />
            <TotalCell
              label={`Margin ${Math.round(marginPercent(totals))}%`}
              value={gbp(totals.margin_pence)}
              palette={palette}
              muted
            />
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: palette.inkMuted }]}>
              Quote total
            </Text>
            <Text style={[styles.totalValue, { color: palette.ink }]}>
              {gbp(totals.total_pence)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave || submitting}
            activeOpacity={0.85}
            style={[
              styles.saveBtn,
              { backgroundColor: !canSave || submitting ? palette.inkMuted : palette.primary },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {editing ? 'Save changes' : 'Save quote'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TotalCell({
  label,
  value,
  palette,
  muted,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useTenant>['palette'];
  muted?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.totalCellLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.totalCellValue,
          { color: muted ? palette.inkMuted : palette.ink },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function field(palette: ReturnType<typeof useTenant>['palette']) {
  return [
    styles.field,
    {
      borderColor: palette.hairline,
      backgroundColor: palette.card,
      color: palette.ink,
    },
  ];
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
  cancel: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  help: {
    fontSize: typography.size.xs,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
    marginBottom: spacing.sm,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  lineCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  lineIndex: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: { gap: 6, paddingVertical: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  row3: { flexDirection: 'row', gap: spacing.sm },
  miniField: { flex: 1 },
  miniLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  linePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  linePriceLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  linePriceValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weightExtraBold as '800',
  },
  addLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  addLineText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  rateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rateChip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '48%',
  },
  rateChipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
  },
  rateChipMeta: { fontSize: typography.size.xs, marginTop: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  totalCellLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalCellValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightBold as '700',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.size.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
  },
  totalValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  saveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
