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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  spacing,
  typography,
  radius,
  gbp,
  formatDate,
  lineCostPence,
  linePricePence,
  paintingAreasFromRooms,
  type QuoteTemplate,
  type PriceBook,
  type GenerateResult,
} from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import {
  listQuoteTemplates,
  loadPriceBook,
  runTemplate,
  setPendingTemplateQuote,
} from '../lib/quote-templates';

type Surface = 'good' | 'patch' | 'bare';
type Woodwork = 'none' | 'some' | 'lots';

const SURFACES: { key: Surface; label: string }[] = [
  { key: 'good', label: 'Sound / painted' },
  { key: 'patch', label: 'Needs filling' },
  { key: 'bare', label: 'Bare / new plaster' },
];
const WOODWORK: { key: Woodwork; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'some', label: 'Some (door, skirting)' },
  { key: 'lots', label: 'Lots' },
];
const COATS = [1, 2, 3];

interface RoomRow {
  key: string;
  length: string;
  width: string;
  height: string;
  ceiling: boolean;
}
let roomSeq = 0;
function blankRoom(): RoomRow {
  roomSeq += 1;
  return { key: `r${roomSeq}`, length: '4', width: '3', height: '2.4', ceiling: true };
}

function onlyNum(s: string): string {
  return s.replace(/[^0-9.]/g, '');
}
function num(s: string, fallback = 0): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export default function QuoteTemplateScreen() {
  const router = useRouter();
  const { palette } = useTenant();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [book, setBook] = useState<PriceBook | null>(null);
  const [selected, setSelected] = useState<QuoteTemplate | null>(null);

  // painter inputs — measure by rooms (auto m²) with a direct-m² fallback
  const [mode, setMode] = useState<'rooms' | 'area'>('rooms');
  const [rooms, setRooms] = useState<RoomRow[]>([blankRoom()]);
  const [directWall, setDirectWall] = useState('40');
  const [directCeilingOn, setDirectCeilingOn] = useState(true);
  const [directCeiling, setDirectCeiling] = useState('14');
  const [coats, setCoats] = useState(2);
  const [surface, setSurface] = useState<Surface>('patch');
  const [woodwork, setWoodwork] = useState<Woodwork>('some');
  const [margin, setMargin] = useState('20');

  const areas = useMemo(() => {
    if (mode === 'area') {
      return {
        wall_area_m2: num(directWall),
        ceiling_area_m2: directCeilingOn ? num(directCeiling) : 0,
      };
    }
    return paintingAreasFromRooms(
      rooms.map((r) => ({
        length_m: num(r.length),
        width_m: num(r.width),
        height_m: num(r.height),
        paint_ceiling: r.ceiling,
      })),
    );
  }, [mode, rooms, directWall, directCeilingOn, directCeiling]);

  function updateRoom(key: string, patch: Partial<RoomRow>) {
    setRooms((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRoom() {
    setRooms((prev) => [...prev, blankRoom()]);
  }
  function removeRoom(key: string) {
    setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tpls, pb] = await Promise.all([listQuoteTemplates(), loadPriceBook()]);
        if (cancelled) return;
        setTemplates(tpls);
        setBook(pb);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inputs = useMemo(
    () => ({
      wall_area_m2: areas.wall_area_m2,
      paint_ceiling: areas.ceiling_area_m2 > 0,
      ceiling_area_m2: areas.ceiling_area_m2,
      coats,
      surface,
      woodwork,
      margin_percent: num(margin),
    }),
    [areas, coats, surface, woodwork, margin],
  );

  const result: GenerateResult | null = useMemo(() => {
    if (!selected || !book) return null;
    return runTemplate(selected, inputs, book);
  }, [selected, book, inputs]);

  const totals = useMemo(() => {
    if (!result) return { cost: 0, price: 0 };
    let cost = 0;
    let price = 0;
    for (const l of result.lines) {
      cost += lineCostPence(l);
      price += linePricePence(l);
    }
    return { cost, price };
  }, [result]);

  function onBuild() {
    if (!selected || !result || result.lines.length === 0) return;
    setPendingTemplateQuote({
      title: selected.name,
      projectType: selected.project_type ?? 'painting',
      pricedOn: result.priced_on,
      lines: result.lines.map((l) => ({
        kind: l.kind,
        saved_rate_id: null,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_cost_pence: l.unit_cost_pence,
        markup_percent: l.markup_percent,
        client_supplied: false,
      })),
    });
    router.replace('/create-estimate');
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
        <TouchableOpacity
          onPress={() => (selected ? setSelected(null) : router.back())}
          hitSlop={10}
        >
          <Text style={[styles.cancel, { color: palette.inkMuted }]}>
            {selected ? 'Back' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]} numberOfLines={1}>
          {selected ? selected.name : 'Start from a template'}
        </Text>
        <View style={{ width: 52 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : !selected ? (
        // ---- PICK A TEMPLATE -------------------------------------------------
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.help, { color: palette.inkMuted }]}>
            Answer a few questions and we&apos;ll build a costed draft with
            suggested prices. Every figure stays editable, and you add your
            margin on top.
          </Text>
          {templates.length === 0 ? (
            <Text style={[styles.help, { color: palette.inkMuted }]}>
              No templates available yet.
            </Text>
          ) : (
            templates.map((t) => {
              const supported = t.engine_key === 'painting_decorating';
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={supported ? 0.85 : 1}
                  disabled={!supported}
                  onPress={() => supported && setSelected(t)}
                  style={[
                    styles.tplCard,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.hairline,
                      opacity: supported ? 1 : 0.55,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tplName, { color: palette.ink }]}>
                      {t.name}
                    </Text>
                    {t.summary ? (
                      <Text style={[styles.tplSummary, { color: palette.inkMuted }]}>
                        {t.summary}
                      </Text>
                    ) : null}
                    {!supported && (
                      <Text style={[styles.tplSoon, { color: palette.inkMuted }]}>
                        Coming soon
                      </Text>
                    )}
                  </View>
                  {supported && (
                    <Ionicons name="chevron-forward" size={20} color={palette.inkMuted} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        // ---- QUESTION FORM (painter) ----------------------------------------
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* mode toggle */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setMode('rooms')}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: mode === 'rooms' ? palette.primary : palette.card,
                    borderColor: mode === 'rooms' ? palette.primary : palette.hairline,
                  },
                ]}
              >
                <Text
                  style={[styles.modeText, { color: mode === 'rooms' ? '#fff' : palette.ink }]}
                >
                  By room
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode('area')}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: mode === 'area' ? palette.primary : palette.card,
                    borderColor: mode === 'area' ? palette.primary : palette.hairline,
                  },
                ]}
              >
                <Text
                  style={[styles.modeText, { color: mode === 'area' ? '#fff' : palette.ink }]}
                >
                  I know the m²
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'rooms' ? (
              <>
                {rooms.map((r, idx) => (
                  <View
                    key={r.key}
                    style={[
                      styles.roomCard,
                      { backgroundColor: palette.card, borderColor: palette.hairline },
                    ]}
                  >
                    <View style={styles.roomHeader}>
                      <Text style={[styles.roomTitle, { color: palette.ink }]}>
                        Room {idx + 1}
                      </Text>
                      {rooms.length > 1 && (
                        <TouchableOpacity onPress={() => removeRoom(r.key)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={18} color={palette.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.roomDims}>
                      {(['length', 'width', 'height'] as const).map((dim) => (
                        <View key={dim} style={styles.roomDim}>
                          <Text style={[styles.miniLabel, { color: palette.inkMuted }]}>
                            {dim === 'length' ? 'Length' : dim === 'width' ? 'Width' : 'Height'} (m)
                          </Text>
                          <TextInput
                            value={r[dim]}
                            onChangeText={(t) => updateRoom(r.key, { [dim]: onlyNum(t) })}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={palette.inkMuted}
                            style={field(palette)}
                          />
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.ceilToggle}
                      onPress={() => updateRoom(r.key, { ceiling: !r.ceiling })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={r.ceiling ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={r.ceiling ? palette.primary : palette.inkMuted}
                      />
                      <Text style={[styles.ceilText, { color: palette.ink }]}>
                        Paint this ceiling
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={addRoom}
                  activeOpacity={0.7}
                  style={[styles.addRoom, { borderColor: palette.primary }]}
                >
                  <Ionicons name="add" size={18} color={palette.primary} />
                  <Text style={[styles.addRoomText, { color: palette.primary }]}>
                    Add a room
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.hint, { color: palette.inkMuted }]}>
                  ≈ {areas.wall_area_m2} m² walls
                  {areas.ceiling_area_m2 > 0 ? ` + ${areas.ceiling_area_m2} m² ceiling` : ''} ·
                  10% knocked off walls for doors & windows.
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.qLabel, { color: palette.ink }]}>Wall area</Text>
                <View style={styles.inlineField}>
                  <TextInput
                    value={directWall}
                    onChangeText={(t) => setDirectWall(onlyNum(t))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={palette.inkMuted}
                    style={field(palette)}
                  />
                  <Text style={[styles.unit, { color: palette.inkMuted }]}>m²</Text>
                </View>
                <View style={styles.switchRow}>
                  <Text style={[styles.qLabel, { color: palette.ink, marginBottom: 0 }]}>
                    Paint the ceiling(s)?
                  </Text>
                  <Switch
                    value={directCeilingOn}
                    onValueChange={setDirectCeilingOn}
                    trackColor={{ true: palette.primary, false: palette.hairline }}
                  />
                </View>
                {directCeilingOn && (
                  <View style={styles.inlineField}>
                    <TextInput
                      value={directCeiling}
                      onChangeText={(t) => setDirectCeiling(onlyNum(t))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={palette.inkMuted}
                      style={field(palette)}
                    />
                    <Text style={[styles.unit, { color: palette.inkMuted }]}>m²</Text>
                  </View>
                )}
              </>
            )}

            <Text style={[styles.qLabel, { color: palette.ink }]}>Coats</Text>
            <View style={styles.chipWrap}>
              {COATS.map((c) => (
                <Chip
                  key={c}
                  label={`${c} coat${c > 1 ? 's' : ''}`}
                  active={coats === c}
                  onPress={() => setCoats(c)}
                  palette={palette}
                />
              ))}
            </View>

            <Text style={[styles.qLabel, { color: palette.ink }]}>Surface condition</Text>
            <View style={styles.chipWrap}>
              {SURFACES.map((s) => (
                <Chip
                  key={s.key}
                  label={s.label}
                  active={surface === s.key}
                  onPress={() => setSurface(s.key)}
                  palette={palette}
                />
              ))}
            </View>

            <Text style={[styles.qLabel, { color: palette.ink }]}>Woodwork (gloss / satin)</Text>
            <View style={styles.chipWrap}>
              {WOODWORK.map((w) => (
                <Chip
                  key={w.key}
                  label={w.label}
                  active={woodwork === w.key}
                  onPress={() => setWoodwork(w.key)}
                  palette={palette}
                />
              ))}
            </View>

            <Text style={[styles.qLabel, { color: palette.ink }]}>Your margin</Text>
            <View style={styles.inlineField}>
              <TextInput
                value={margin}
                onChangeText={(t) => setMargin(onlyNum(t))}
                keyboardType="decimal-pad"
                placeholder="20"
                placeholderTextColor={palette.inkMuted}
                style={field(palette)}
              />
              <Text style={[styles.unit, { color: palette.inkMuted }]}>%</Text>
            </View>
            <Text style={[styles.hint, { color: palette.inkMuted }]}>
              Applied to every line on top of cost. Change it to your usual margin.
            </Text>

            {/* live preview of generated lines */}
            {result && result.lines.length > 0 && (
              <View
                style={[
                  styles.preview,
                  { backgroundColor: palette.card, borderColor: palette.hairline },
                ]}
              >
                <Text style={[styles.previewTitle, { color: palette.ink }]}>
                  Draft quote
                </Text>
                {result.lines.map((l, i) => (
                  <View key={i} style={styles.previewRow}>
                    <Text
                      style={[styles.previewDesc, { color: palette.inkMuted }]}
                      numberOfLines={1}
                    >
                      {l.description}
                    </Text>
                    <Text style={[styles.previewVal, { color: palette.ink }]}>
                      {gbp(linePricePence(l))}
                    </Text>
                  </View>
                ))}
                {result.priced_on && (
                  <Text style={[styles.pricedOn, { color: palette.inkMuted }]}>
                    Materials priced as of {formatDate(result.priced_on, { short: true })} ·
                    editable
                  </Text>
                )}
              </View>
            )}

            <View style={{ height: 150 }} />
          </ScrollView>

          <View
            style={[
              styles.footer,
              { backgroundColor: palette.card, borderTopColor: palette.hairline },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: palette.inkMuted }]}>
                Your cost {gbp(totals.cost)} · Client (ex-VAT)
              </Text>
              <Text style={[styles.totalValue, { color: palette.ink }]}>
                {gbp(totals.price)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onBuild}
              disabled={!result || result.lines.length === 0}
              activeOpacity={0.85}
              style={[
                styles.buildBtn,
                {
                  backgroundColor:
                    !result || result.lines.length === 0
                      ? palette.inkMuted
                      : palette.primary,
                },
              ]}
            >
              <Text style={styles.buildText}>Build quote</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTenant>['palette'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: active ? palette.primary : palette.card,
          borderColor: active ? palette.primary : palette.hairline,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : palette.ink }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function field(palette: ReturnType<typeof useTenant>['palette']) {
  return [
    styles.field,
    { borderColor: palette.hairline, backgroundColor: palette.card, color: palette.ink },
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
    flex: 1,
    textAlign: 'center',
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  help: { fontSize: typography.size.body, lineHeight: 21, marginBottom: spacing.lg },
  tplCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  tplName: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
  },
  tplSummary: { fontSize: typography.size.sm, marginTop: 3, lineHeight: 19 },
  tplSoon: {
    fontSize: typography.size.xs,
    marginTop: 6,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  qLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modeText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
  roomCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  roomTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightExtraBold as '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roomDims: { flexDirection: 'row', gap: spacing.sm },
  roomDim: { flex: 1 },
  miniLabel: {
    fontSize: 10,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ceilToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  ceilText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
  addRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  addRoomText: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  inlineField: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unit: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600' },
  field: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  hint: { fontSize: typography.size.xs, lineHeight: 16, marginTop: spacing.xs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightSemibold as '600',
  },
  preview: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  previewTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weightExtraBold as '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewDesc: { flex: 1, fontSize: typography.size.sm, marginRight: spacing.sm },
  previewVal: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  pricedOn: { fontSize: typography.size.xs, marginTop: spacing.sm, lineHeight: 15 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  totalValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  buildBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
});
