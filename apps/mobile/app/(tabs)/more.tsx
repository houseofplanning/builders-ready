import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { supabase } from '../../lib/supabase';

type MoreRoute =
  | '/variations'
  | '/invoices'
  | '/reports'
  | '/messages'
  | '/settings';

interface MoreItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
  route?: MoreRoute;
  comingSoon?: boolean;
}

const ITEMS: MoreItem[] = [
  {
    label: 'Variations',
    icon: 'document-text-outline',
    hint: 'Change orders to review or propose',
    route: '/variations',
  },
  {
    label: 'Invoices',
    icon: 'card-outline',
    hint: 'Bank details, payments, audit trail',
    route: '/invoices',
  },
  {
    label: 'Reports',
    icon: 'reader-outline',
    hint: 'Weekly summary PDFs and structured updates',
    route: '/reports',
  },
  {
    label: 'Messages',
    icon: 'chatbubbles-outline',
    hint: 'Direct chat with your project counterpart',
    route: '/messages',
  },
  {
    label: 'Settings',
    icon: 'settings-outline',
    hint: 'Profile, biometric unlock, sign out',
    route: '/settings',
  },
];

export default function MoreTab() {
  const router = useRouter();
  const { tenant, palette } = useTenant();
  const [signingOut, setSigningOut] = useState(false);

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
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={styles.scroll}
    >
      <Text style={[styles.heading, { color: palette.ink }]}>More</Text>
      <Text style={[styles.sub, { color: palette.inkMuted }]}>
        {tenant
          ? `Other actions inside ${tenant.name}.`
          : 'Other actions.'}
      </Text>

      <View
        style={[
          styles.group,
          { backgroundColor: palette.card, borderColor: palette.hairline },
        ]}
      >
        {ITEMS.map((item, i) => {
          const Wrapper = item.route ? TouchableOpacity : View;
          return (
            <Wrapper
              key={item.label}
              onPress={item.route ? () => router.push(item.route!) : undefined}
              activeOpacity={item.route ? 0.6 : 1}
              style={[
                styles.row,
                i < ITEMS.length - 1 && {
                  borderBottomColor: palette.hairline,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={palette.primary}
                style={styles.rowIcon}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: palette.ink }]}>
                  {item.label}
                </Text>
                <Text style={[styles.rowHint, { color: palette.inkMuted }]}>
                  {item.hint}
                </Text>
              </View>
              {item.comingSoon ? (
                <Text
                  style={[
                    styles.rowBadge,
                    { color: palette.accentDeep, backgroundColor: palette.accentSoft },
                  ]}
                >
                  Soon
                </Text>
              ) : item.route ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={palette.inkMuted}
                />
              ) : null}
            </Wrapper>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={onSignOut}
        disabled={signingOut}
        style={[
          styles.signOut,
          { borderColor: palette.hairline, backgroundColor: palette.card },
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: typography.size.sm,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  rowIcon: {
    width: 28,
  },
  rowText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  rowLabel: {
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  rowHint: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  rowBadge: {
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
    fontWeight: typography.weightSemibold as '600',
  },
});
