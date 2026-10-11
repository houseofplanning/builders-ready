import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { palette, spacing, typography, radius, relativeTime } from '@br/shared';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../lib/tenant-provider';
import {
  getMyAccount,
  updateMyProfile,
  updateNotificationPrefs,
  uploadAvatar,
  changePassword,
  listMyReviews,
  type AccountProfile,
  type MyReviews,
  type NotificationPrefs,
} from '../../lib/account';

export default function CustomerAccount() {
  const { user_id } = useTenant();
  const [acct, setAcct] = useState<AccountProfile | null>(null);
  const [reviews, setReviews] = useState<MyReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  // Password
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [a, r] = await Promise.all([getMyAccount(user_id), listMyReviews(user_id)]);
      if (a) {
        setAcct(a);
        setAvatarBroken(false);
        setName(a.full_name);
        setPhone(a.phone ?? '');
      }
      setReviews(r);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user_id]);

  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dirty =
    !!acct && (name.trim() !== acct.full_name || phone.trim() !== (acct.phone ?? ''));

  async function onChangeAvatar() {
    if (!user_id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (res.canceled || !res.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user_id, res.assets[0].uri);
      setAcct((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSaveProfile() {
    if (!user_id || !dirty) return;
    setSavingProfile(true);
    try {
      await updateMyProfile(user_id, { full_name: name, phone });
      setAcct((prev) =>
        prev ? { ...prev, full_name: name.trim(), phone: phone.trim() || null } : prev,
      );
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function onTogglePref(key: keyof NotificationPrefs, value: boolean) {
    if (!user_id || !acct) return;
    const next = { ...acct.notification_prefs, [key]: value };
    setAcct({ ...acct, notification_prefs: next }); // optimistic
    try {
      await updateNotificationPrefs(user_id, next);
    } catch {
      setAcct({ ...acct }); // revert on failure
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  async function onChangePassword() {
    if (newPw.length < 8) {
      Alert.alert('Too short', 'Use at least 8 characters.');
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(newPw);
      setNewPw('');
      Alert.alert('Password updated', 'Your new password is saved.');
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setPwBusy(false);
    }
  }

  function onSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initials = (acct?.full_name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <ActivityIndicator color={palette.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !acct) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <Ionicons name="alert-circle-outline" size={46} color={palette.inkMuted} />
        <Text style={[styles.htitle, { marginTop: spacing.md }]}>Couldn&apos;t load your account</Text>
        <Text style={[styles.emptyNote, { textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg }]}>
          Something went wrong. Please try again.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            void load();
          }}
          activeOpacity={0.85}
          style={[styles.saveBtn, { paddingHorizontal: spacing.xl, marginTop: spacing.lg }]}
        >
          <Text style={styles.saveBtnText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <Text style={styles.htitle}>Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={palette.primary}
          />
        }
      >
        {/* IDENTITY */}
        <View style={styles.identity}>
          <TouchableOpacity onPress={onChangeAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
            {acct?.avatar_url && !avatarBroken ? (
              <Image
                source={{ uri: acct.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {reviews?.averageAboutMe != null && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color="#F4A62A" />
              <Text style={styles.ratingText}>
                {reviews.averageAboutMe.toFixed(1)} · {reviews.aboutMe.length}{' '}
                {reviews.aboutMe.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          )}
        </View>

        {/* PROFILE */}
        <SectionTitle>Profile</SectionTitle>
        <View style={styles.card}>
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
            />
          </Field>
          <View style={styles.divider} />
          <Field label="Phone">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Add a contact number"
              placeholderTextColor={palette.inkMuted}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Field>
          <View style={styles.divider} />
          <Field label="Email">
            <Text style={[styles.input, styles.readonly]}>{acct?.email}</Text>
          </Field>
        </View>
        <TouchableOpacity
          onPress={onSaveProfile}
          disabled={!dirty || savingProfile}
          activeOpacity={0.85}
          style={[styles.saveBtn, (!dirty || savingProfile) && styles.saveBtnDisabled]}
        >
          {savingProfile ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save changes</Text>
          )}
        </TouchableOpacity>

        {/* NOTIFICATIONS */}
        <SectionTitle>Notifications</SectionTitle>
        <View style={styles.card}>
          <ToggleRow
            label="Push notifications"
            sub="New quotes, messages and project updates"
            value={acct?.notification_prefs.push ?? true}
            onValueChange={(v) => onTogglePref('push', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Email notifications"
            sub="Summaries and important updates by email"
            value={acct?.notification_prefs.email ?? true}
            onValueChange={(v) => onTogglePref('email', v)}
          />
        </View>

        {/* REVIEWS */}
        <SectionTitle>Reviews about you</SectionTitle>
        {reviews && reviews.aboutMe.length > 0 ? (
          reviews.aboutMe.map((r) => (
            <ReviewCard key={r.id} name={r.counterpart_name} rating={r.rating} body={r.body} when={r.created_at} />
          ))
        ) : (
          <Text style={styles.emptyNote}>
            No reviews yet. Builders can review you after a completed job.
          </Text>
        )}

        {reviews && reviews.byMe.length > 0 && (
          <>
            <SectionTitle>Reviews you&rsquo;ve left</SectionTitle>
            {reviews.byMe.map((r) => (
              <ReviewCard
                key={r.id}
                name={r.counterpart_name}
                rating={r.rating}
                body={r.body}
                when={r.created_at}
              />
            ))}
          </>
        )}

        {/* SECURITY */}
        <SectionTitle>Security</SectionTitle>
        <View style={styles.card}>
          <Field label="New password">
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              placeholder="At least 8 characters"
              placeholderTextColor={palette.inkMuted}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>
        </View>
        <TouchableOpacity
          onPress={onChangePassword}
          disabled={newPw.length < 8 || pwBusy}
          activeOpacity={0.85}
          style={[styles.saveBtn, (newPw.length < 8 || pwBusy) && styles.saveBtnDisabled]}
        >
          {pwBusy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Update password</Text>
          )}
        </TouchableOpacity>

        {/* SIGN OUT */}
        <TouchableOpacity onPress={onSignOut} activeOpacity={0.7} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={18} color="#C0392B" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- subcomponents ----------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.hairline, true: palette.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

function ReviewCard({
  name,
  rating,
  body,
  when,
}: {
  name: string;
  rating: number;
  body: string | null;
  when: string;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewName}>{name}</Text>
        <Text style={styles.reviewWhen}>{relativeTime(when)}</Text>
      </View>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons
            key={n}
            name={n <= rating ? 'star' : 'star-outline'}
            size={14}
            color={n <= rating ? '#F4A62A' : palette.inkMuted}
          />
        ))}
      </View>
      {body ? <Text style={styles.reviewBody}>{body}</Text> : null}
    </View>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  htitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.ink,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  identity: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  avatarWrap: { width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: palette.card },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  avatarInitials: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    color: palette.primary,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.canvas,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  ratingText: { fontSize: typography.size.sm, fontWeight: typography.weightBold as '700', color: palette.ink },

  sectionTitle: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: typography.weightSemibold as '600',
    color: palette.inkMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  field: { paddingVertical: spacing.sm },
  fieldLabel: {
    fontSize: 10,
    fontWeight: typography.weightBold as '700',
    color: palette.inkMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  input: { fontSize: typography.size.body, color: palette.ink, paddingVertical: 4 },
  readonly: { color: palette.inkMuted },
  divider: { height: 1, backgroundColor: palette.hairline },

  saveBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  toggleLabel: { fontSize: typography.size.body, fontWeight: typography.weightBold as '700', color: palette.ink },
  toggleSub: { fontSize: typography.size.xs, color: palette.inkMuted, marginTop: 2, lineHeight: 16 },

  emptyNote: { fontSize: typography.size.sm, color: palette.inkMuted, lineHeight: 20 },
  reviewCard: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: typography.size.body, fontWeight: typography.weightExtraBold as '800', color: palette.ink },
  reviewWhen: { fontSize: typography.size.xs, color: palette.inkMuted },
  stars: { flexDirection: 'row', gap: 2, marginTop: 4 },
  reviewBody: { fontSize: typography.size.sm, color: palette.ink, marginTop: spacing.sm, lineHeight: 20 },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: 12,
  },
  signOutText: { color: '#C0392B', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' },
});
