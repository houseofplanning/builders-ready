import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { SelectField } from '../components/select-field';
import {
  geocodePostcode,
  searchPlanningListings,
  savePlanningSearch,
  planningRadarEntitled,
  listPipeline,
  statusBadge,
  milesFromKm,
  STAGE_LABELS,
  WORK_CATEGORY_OPTIONS,
  STATUS_FILTER_OPTIONS,
  DISTANCE_OPTIONS,
  type PlanningListing,
  type PipelineItem,
  type GeoPoint,
} from '../lib/planning-radar';

const PREFS_KEY = 'br.planning-radar.prefs.v1';
type Segment = 'browse' | 'pipeline';

export default function PlanningRadarScreen() {
  const router = useRouter();
  const { tenant, role, user_id, palette } = useTenant();
  const isTrade = !!tenant && (role === 'owner' || role === 'pm') && planningRadarEntitled();
  const [savingAlert, setSavingAlert] = useState(false);

  async function saveAlert() {
    if (!tenant || !user_id || !geo) return;
    setSavingAlert(true);
    try {
      await savePlanningSearch({
        tenantId: tenant.id,
        userId: user_id,
        name: geo.label,
        centerLat: geo.lat,
        centerLon: geo.lon,
        radiusKm: Number(distance),
        workCategory: workCategory || undefined,
        statusCsv: statusCsv || undefined,
      });
      Alert.alert(
        'Alert saved',
        "We'll notify you each morning when new planning jobs appear in this area.",
      );
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSavingAlert(false);
    }
  }

  const [segment, setSegment] = useState<Segment>('browse');
  const [postcode, setPostcode] = useState('');
  const [distance, setDistance] = useState('8'); // km (5 miles)
  const [workCategory, setWorkCategory] = useState('');
  const [statusCsv, setStatusCsv] = useState('approved,pending');
  const [geo, setGeo] = useState<GeoPoint | null>(null);

  const [listings, setListings] = useState<PlanningListing[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Restore last-used area + distance.
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p.postcode) setPostcode(p.postcode);
          if (p.distance) setDistance(p.distance);
          if (p.workCategory != null) setWorkCategory(p.workCategory);
          if (p.statusCsv != null) setStatusCsv(p.statusCsv);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const runSearch = useCallback(
    async (point?: GeoPoint) => {
      if (!isTrade) return;
      setError(null);
      setLoading(true);
      try {
        let g = point ?? geo;
        if (!g) {
          g = await geocodePostcode(postcode);
          if (!g) {
            setError("We couldn't find that postcode. Try the full postcode or the area code (e.g. M1).");
            setListings([]);
            setLoading(false);
            return;
          }
          setGeo(g);
        }
        const rows = await searchPlanningListings({
          lat: g.lat,
          lon: g.lon,
          radiusKm: Number(distance),
          workCategory: workCategory || undefined,
          statusCsv: statusCsv || undefined,
        });
        setListings(rows);
        setSearched(true);
        void AsyncStorage.setItem(
          PREFS_KEY,
          JSON.stringify({ postcode, distance, workCategory, statusCsv }),
        );
      } catch {
        setError('Something went wrong loading planning jobs. Pull to refresh or try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isTrade, geo, postcode, distance, workCategory, statusCsv],
  );

  const loadPipeline = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      setPipeline(await listPipeline(tenant.id));
      setError(null);
    } catch {
      setError("Couldn't load your pipeline.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenant]);

  // Refresh pipeline whenever the screen regains focus while on that segment
  // (so stage changes made in the detail view show immediately).
  useFocusEffect(
    useCallback(() => {
      if (segment === 'pipeline') void loadPipeline();
    }, [segment, loadPipeline]),
  );

  function onSegment(s: Segment) {
    setSegment(s);
    if (s === 'pipeline') void loadPipeline();
  }

  const badgeColors = statusBadge;

  function ListingCard({ l }: { l: PlanningListing }) {
    const b = badgeColors(l.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/planning-radar/${encodeURIComponent(l.id)}`)}
        style={[styles.card, { backgroundColor: palette.card, borderColor: palette.hairline }]}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.chip, { color: palette.primary, backgroundColor: palette.canvas }]}>
            {l.work_category ?? 'Planning'}
          </Text>
          <Text style={[styles.badge, { color: b.fg, backgroundColor: b.bg }]}>{b.label}</Text>
        </View>
        <Text style={[styles.addr, { color: palette.ink }]} numberOfLines={2}>
          {l.address}
        </Text>
        <Text style={[styles.meta, { color: palette.inkMuted }]}>
          {[milesFromKm(l.distance_km), l.authority].filter(Boolean).join(' · ')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.hairline }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 26 }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Planning Radar</Text>
        <View style={{ width: 26 }} />
      </View>

      {!isTrade ? (
        <View style={styles.center}>
          <Ionicons name="radio-outline" size={42} color={palette.inkMuted} />
          <Text style={[styles.empty, { color: palette.inkMuted }]}>
            Planning Radar is for trade accounts.
          </Text>
        </View>
      ) : (
        <>
          {/* Browse / Pipeline segmented control */}
          <View style={[styles.segRow, { borderColor: palette.hairline }]}>
            {(['browse', 'pipeline'] as Segment[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => onSegment(s)}
                activeOpacity={0.8}
                style={[
                  styles.segBtn,
                  segment === s && { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: segment === s ? '#fff' : palette.inkMuted },
                  ]}
                >
                  {s === 'browse' ? 'Browse' : 'My pipeline'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {segment === 'browse' ? (
            <>
              {/* Search row: postcode + go */}
              <View style={styles.searchRow}>
                <View style={[styles.searchBox, { borderColor: palette.hairline, backgroundColor: palette.card }]}>
                  <Ionicons name="location-outline" size={16} color={palette.inkMuted} />
                  <TextInput
                    value={postcode}
                    onChangeText={(t) => {
                      setPostcode(t);
                      setGeo(null);
                    }}
                    placeholder="Your area postcode (e.g. M1)"
                    placeholderTextColor={palette.inkMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => void runSearch()}
                    style={[styles.searchInput, { color: palette.ink }]}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => void runSearch()}
                  activeOpacity={0.85}
                  style={[styles.goBtn, { backgroundColor: palette.primary }]}
                >
                  <Text style={styles.goBtnText}>Search</Text>
                </TouchableOpacity>
              </View>

              {/* Filters */}
              <View style={styles.filterRow}>
                <View style={{ flex: 1 }}>
                  <SelectField
                    value={distance}
                    onChange={(v) => {
                      setDistance(v);
                      if (geo) void runSearch(geo);
                    }}
                    title="Distance"
                    options={DISTANCE_OPTIONS}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField
                    value={statusCsv}
                    onChange={(v) => {
                      setStatusCsv(v);
                      if (geo) void runSearch(geo);
                    }}
                    title="Status"
                    options={STATUS_FILTER_OPTIONS}
                  />
                </View>
              </View>
              <View style={[styles.filterRow, { paddingTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <SelectField
                    value={workCategory}
                    onChange={(v) => {
                      setWorkCategory(v);
                      if (geo) void runSearch(geo);
                    }}
                    title="Work type"
                    options={WORK_CATEGORY_OPTIONS}
                  />
                </View>
              </View>

              {loading ? (
                <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
              ) : (
                <ScrollView
                  contentContainerStyle={styles.scroll}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => {
                        setRefreshing(true);
                        void runSearch();
                      }}
                      tintColor={palette.primary}
                    />
                  }
                >
                  {error ? (
                    <Text style={[styles.empty, { color: palette.inkMuted }]}>{error}</Text>
                  ) : !searched ? (
                    <View style={styles.hint}>
                      <Ionicons name="radio-outline" size={40} color={palette.inkMuted} />
                      <Text style={[styles.empty, { color: palette.inkMuted }]}>
                        Enter your area and tap Search to see planning jobs being
                        planned near you.
                      </Text>
                    </View>
                  ) : listings.length === 0 ? (
                    <Text style={[styles.empty, { color: palette.inkMuted }]}>
                      No planning jobs here yet. We&apos;re now watching this area —
                      new applications will appear within a day. Try widening the
                      distance or clearing the work-type filter.
                    </Text>
                  ) : (
                    <>
                      <View style={styles.resultsHead}>
                        <Text style={[styles.count, { color: palette.inkMuted }]}>
                          {listings.length} within {milesFromKm(Number(distance))}
                          {geo ? ` of ${geo.label}` : ''}
                        </Text>
                        <TouchableOpacity
                          onPress={saveAlert}
                          disabled={savingAlert || !geo}
                          activeOpacity={0.8}
                          style={[styles.alertBtn, { borderColor: palette.primary }]}
                        >
                          <Ionicons name="notifications-outline" size={14} color={palette.primary} />
                          <Text style={[styles.alertBtnText, { color: palette.primary }]}>
                            {savingAlert ? 'Saving…' : 'Alert me'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {listings.map((l) => (
                        <ListingCard key={l.id} l={l} />
                      ))}
                    </>
                  )}
                </ScrollView>
              )}
            </>
          ) : (
            // Pipeline
            loading ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={palette.primary} />
            ) : (
              <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      void loadPipeline();
                    }}
                    tintColor={palette.primary}
                  />
                }
              >
                {pipeline.length === 0 ? (
                  <Text style={[styles.empty, { color: palette.inkMuted }]}>
                    Nothing saved yet. Open a planning job and tap Save or Mark
                    approached to track it here.
                  </Text>
                ) : (
                  pipeline.map((p) => {
                    const b = badgeColors(p.listing.status);
                    return (
                      <TouchableOpacity
                        key={p.listing.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          router.push(`/planning-radar/${encodeURIComponent(p.listing.id)}`)
                        }
                        style={[styles.card, { backgroundColor: palette.card, borderColor: palette.hairline }]}
                      >
                        <View style={styles.cardTop}>
                          <Text style={[styles.chip, { color: palette.primary, backgroundColor: palette.canvas }]}>
                            {p.listing.work_category ?? 'Planning'}
                          </Text>
                          <Text style={[styles.stagePill, { color: '#fff', backgroundColor: palette.primary }]}>
                            {STAGE_LABELS[p.stage]}
                          </Text>
                        </View>
                        <Text style={[styles.addr, { color: palette.ink }]} numberOfLines={2}>
                          {p.listing.address}
                        </Text>
                        <Text style={[styles.meta, { color: palette.inkMuted }]}>
                          {[p.listing.authority, b.label.toLowerCase()].filter(Boolean).join(' · ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weightExtraBold as '800' },
  segRow: {
    flexDirection: 'row',
    margin: spacing.lg,
    marginBottom: 0,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segText: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: typography.size.body, padding: 0 },
  goBtn: { borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  goBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hint: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  count: { fontSize: typography.size.xs, fontWeight: typography.weightSemibold as '600', flex: 1 },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  alertBtnText: { fontSize: typography.size.xs, fontWeight: typography.weightBold as '700' },
  empty: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.size.sm, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  chip: {
    fontSize: 11,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    overflow: 'hidden',
  },
  badge: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    overflow: 'hidden',
    letterSpacing: 0.4,
  },
  stagePill: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  addr: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800' },
  meta: { fontSize: typography.size.sm, marginTop: 3 },
});
