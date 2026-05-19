import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { supabase } from '../lib/supabase';
import {
  readBiometricCapabilities,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricInfo,
} from '../lib/biometric';

export default function SettingsScreen() {
  const router = useRouter();
  const { tenant, role, palette, user_id } = useTenant();

  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
  } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [bio, setBio] = useState<BiometricInfo | null>(null);
  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [bioBusy, setBioBusy] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  // --- load profile ---
  useEffect(() => {
    if (!user_id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .eq('id', user_id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setNameDraft(data.full_name);
      }
    })();
  }, [user_id]);

  // --- load biometric capability + toggle state ---
  useEffect(() => {
    if (!user_id) return;
    (async () => {
      const caps = await readBiometricCapabilities();
      setBio(caps);
      if (caps.supported && caps.enrolled) {
        setBioEnabled(await isBiometricEnabled(user_id));
      }
    })();
  }, [user_id]);

  async function saveName() {
    if (!user_id || !nameDraft.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameDraft.trim() })
      .eq('id', user_id);
    setSavingProfile(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setProfile((p) => (p ? { ...p, full_name: nameDraft.trim() } : p));
    setEditingName(false);
  }

  async function toggleBiometric(next: boolean) {
    if (!user_id || !bio) return;
    setBioBusy(true);
    try {
      await setBiometricEnabled(user_id, next);
      setBioEnabled(next);
    } catch (err) {
      Alert.alert(
        'Could not change setting',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setBioBusy(false);
    }
  }

  async function onSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
        },
      },
    ]);
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
          Settings
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ACCOUNT */}
        <Text style={[styles.section, { color: palette.inkMuted }]}>
          Account
        </Text>
        <View
          style={[
            styles.group,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: palette.inkMuted }]}>
              Name
            </Text>
            {editingName ? (
              <View style={styles.rowRight}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  style={[
                    styles.nameInput,
                    { borderColor: palette.primary, color: palette.ink },
                  ]}
                />
                <TouchableOpacity
                  onPress={saveName}
                  disabled={savingProfile}
                  hitSlop={6}
                  style={{ marginLeft: 6 }}
                >
                  {savingProfile ? (
                    <ActivityIndicator color={palette.primary} />
                  ) : (
                    <Ionicons name="checkmark" size={22} color={palette.primary} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEditingName(true)}
                style={styles.rowRight}
                hitSlop={6}
              >
                <Text style={[styles.rowValue, { color: palette.ink }]}>
                  {profile?.full_name ?? '—'}
                </Text>
                <Ionicons
                  name="pencil"
                  size={16}
                  color={palette.inkMuted}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.row, styles.rowBorder, { borderTopColor: palette.hairline }]}>
            <Text style={[styles.rowLabel, { color: palette.inkMuted }]}>
              Email
            </Text>
            <Text style={[styles.rowValue, { color: palette.ink }]}>
              {profile?.email ?? '—'}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder, { borderTopColor: palette.hairline }]}>
            <Text style={[styles.rowLabel, { color: palette.inkMuted }]}>
              Role
            </Text>
            <Text style={[styles.rowValue, { color: palette.ink }]}>
              {role === 'owner'
                ? 'Owner'
                : role === 'pm'
                  ? 'Project Manager'
                  : role === 'client'
                    ? 'Client'
                    : '—'}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder, { borderTopColor: palette.hairline }]}>
            <Text style={[styles.rowLabel, { color: palette.inkMuted }]}>
              Tenant
            </Text>
            <Text style={[styles.rowValue, { color: palette.ink }]} numberOfLines={1}>
              {tenant?.name ?? '—'}
            </Text>
          </View>
        </View>

        {/* SECURITY */}
        <Text style={[styles.section, { color: palette.inkMuted }]}>
          Security
        </Text>
        <View
          style={[
            styles.group,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: palette.ink, textTransform: 'none' }]}>
                {bio?.typeLabel ?? 'Biometric'} unlock
              </Text>
              <Text style={[styles.rowHint, { color: palette.inkMuted }]}>
                {bio?.supported && bio.enrolled
                  ? `Use ${bio.typeLabel} when re-opening Builders Ready.`
                  : bio?.supported && !bio.enrolled
                    ? `Set up ${bio.typeLabel} in iOS/Android settings first.`
                    : 'Not available on this device.'}
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              disabled={!bio?.supported || !bio.enrolled || bioBusy}
              trackColor={{ false: palette.hairline, true: palette.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
        {bioEnabled && (
          <Text style={[styles.smallHint, { color: palette.inkMuted }]}>
            Heads up: enforcement on app launch lands in a polish session. The
            toggle is stored now so we can wire it in cleanly.
          </Text>
        )}

        {/* NOTIFICATIONS (placeholder) */}
        <Text style={[styles.section, { color: palette.inkMuted }]}>
          Notifications
        </Text>
        <View
          style={[
            styles.group,
            { backgroundColor: palette.card, borderColor: palette.hairline },
          ]}
        >
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: palette.ink, textTransform: 'none' }]}>
                Push notifications
              </Text>
              <Text style={[styles.rowHint, { color: palette.inkMuted }]}>
                Project updates, decisions, variations and invoices.
              </Text>
            </View>
            <Text
              style={[
                styles.soonBadge,
                { backgroundColor: palette.accentSoft, color: palette.accentDeep },
              ]}
            >
              Soon
            </Text>
          </View>
        </View>

        {/* DANGER */}
        <TouchableOpacity
          onPress={onSignOut}
          disabled={signingOut}
          style={[
            styles.signOut,
            { borderColor: palette.error, backgroundColor: palette.card },
          ]}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator color={palette.error} />
          ) : (
            <Text style={[styles.signOutText, { color: palette.error }]}>
              Sign out
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: palette.inkMuted }]}>
          Builders Ready · v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
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
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  group: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  rowLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    width: 90,
  },
  rowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rowValue: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
    flexShrink: 1,
  },
  rowHint: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  nameInput: {
    flex: 1,
    borderBottomWidth: 1.5,
    paddingVertical: 2,
    paddingHorizontal: 4,
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  smallHint: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 16,
  },
  soonBadge: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    overflow: 'hidden',
  },
  signOut: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: typography.size.body,
    fontWeight: typography.weightBold as '700',
  },
  versionText: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: typography.size.xs,
  },
});
