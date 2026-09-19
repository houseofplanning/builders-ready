import { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  spacing,
  typography,
  radius,
  COST_CATEGORY_LABELS,
  COST_CATEGORIES,
} from '@br/shared';
import type { CostCategory } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { useCurrentProject } from '../lib/current-project';
import { createCost, uploadCostReceipt } from '../lib/costs';

function poundsToPence(s: string): number {
  const n = Number(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function AddCostScreen() {
  const router = useRouter();
  const { tenant, user_id, palette } = useTenant();
  const { current, refresh } = useCurrentProject();
  const projectId = current?.project.id;

  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<CostCategory>('materials');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [incurredOn, setIncurredOn] = useState<string>(todayISO());
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amountPence = poundsToPence(amountText);
  const canSave = amountPence > 0 && description.trim().length > 0;

  async function pickReceipt(fromCamera: boolean) {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow access to add a receipt photo.');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Could not add photo', err instanceof Error ? err.message : 'Error');
    }
  }

  function onAddReceipt() {
    Alert.alert('Add receipt', undefined, [
      { text: 'Take photo', onPress: () => pickReceipt(true) },
      { text: 'Choose from library', onPress: () => pickReceipt(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function onSave() {
    if (!tenant || !user_id || !projectId) return;
    if (!canSave) {
      Alert.alert('Add an amount and description', 'What did you spend, and on what?');
      return;
    }
    setSubmitting(true);
    try {
      let receiptPath: string | null = null;
      if (receiptUri) {
        receiptPath = await uploadCostReceipt(tenant.id, projectId, receiptUri);
      }
      await createCost({
        tenant_id: tenant.id,
        project_id: projectId,
        created_by: user_id,
        category,
        description: description.trim(),
        amount_pence: amountPence,
        supplier: supplier.trim() || null,
        incurred_on: incurredOn,
        receipt_storage_path: receiptPath,
      });
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert('Could not save cost', err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!tenant || !user_id || !projectId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={styles.center}>
          <Text style={{ color: palette.inkMuted }}>No project selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const field = [
    styles.field,
    {
      borderColor: palette.hairline,
      backgroundColor: palette.card,
      color: palette.ink,
    },
  ];

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
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Add a cost</Text>
        <TouchableOpacity onPress={onSave} disabled={!canSave || submitting} hitSlop={10}>
          {submitting ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Text
              style={[
                styles.save,
                { color: canSave ? palette.primary : palette.inkMuted },
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: palette.inkMuted }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currency, { color: palette.inkMuted }]}>£</Text>
            <TextInput
              value={amountText}
              onChangeText={(t) => setAmountText(t.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={palette.inkMuted}
              keyboardType="decimal-pad"
              style={[field, { flex: 1 }]}
            />
          </View>

          <Text style={[styles.label, { color: palette.inkMuted }]}>Category</Text>
          <View style={styles.chipWrap}>
            {COST_CATEGORIES.map((k) => {
              const active = category === k;
              return (
                <TouchableOpacity
                  key={k}
                  onPress={() => setCategory(k)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : palette.ink }]}>
                    {COST_CATEGORY_LABELS[k]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: palette.inkMuted }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Plasterboard & fixings"
            placeholderTextColor={palette.inkMuted}
            style={field}
          />

          <Text style={[styles.label, { color: palette.inkMuted }]}>Supplier (optional)</Text>
          <TextInput
            value={supplier}
            onChangeText={setSupplier}
            placeholder="e.g. Travis Perkins"
            placeholderTextColor={palette.inkMuted}
            style={field}
          />

          <Text style={[styles.label, { color: palette.inkMuted }]}>Date</Text>
          <View style={styles.chipWrap}>
            {[
              { v: todayISO(), label: 'Today' },
              { v: yesterdayISO(), label: 'Yesterday' },
            ].map((d) => {
              const active = incurredOn === d.v;
              return (
                <TouchableOpacity
                  key={d.label}
                  onPress={() => setIncurredOn(d.v)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: active ? palette.primary : palette.hairline,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : palette.ink }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: palette.inkMuted }]}>Receipt (optional)</Text>
          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImg} />
              <TouchableOpacity
                onPress={() => setReceiptUri(null)}
                style={[styles.removeReceipt, { backgroundColor: palette.error }]}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onAddReceipt}
              activeOpacity={0.7}
              style={[styles.receiptBtn, { borderColor: palette.primary }]}
            >
              <Ionicons name="camera-outline" size={20} color={palette.primary} />
              <Text style={[styles.receiptBtnText, { color: palette.primary }]}>
                Snap or choose a receipt
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  cancel: { fontSize: typography.size.body, fontWeight: typography.weightSemibold as '600' },
  headerTitle: { fontSize: typography.size.md, fontWeight: typography.weightBold as '700' },
  save: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  scroll: { padding: spacing.lg },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.body,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currency: { fontSize: typography.size.lg, fontWeight: typography.weightBold as '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weightSemibold as '600' },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  receiptBtnText: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
  receiptPreview: { position: 'relative', alignSelf: 'flex-start' },
  receiptImg: { width: 140, height: 140, borderRadius: radius.md },
  removeReceipt: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
