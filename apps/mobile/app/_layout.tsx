import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { palette } from '@br/shared';
import { TenantProvider, useTenant } from '../lib/tenant-provider';
import { CurrentProjectProvider } from '../lib/current-project';
import { useSession } from '../lib/session';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TenantProvider>
        <CurrentProjectProvider>
          <AuthGate />
        </CurrentProjectProvider>
      </TenantProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

/**
 * AuthGate redirects between (auth) and (tabs) groups based on session state.
 *
 * - No session  →  /(auth)/login
 * - Session     →  /(tabs)
 *
 * Tenant-membership state is handled inside (tabs) — a logged-in user with
 * no tenant_members row (rare: deleted membership / corrupt state) sees a
 * "no tenant" empty state rather than being kicked back to login.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: sessionLoading } = useSession();
  const { loading: tenantLoading } = useTenant();

  useEffect(() => {
    if (sessionLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    // Route groups like (auth) and (tabs) are transparent in URLs.
    // Navigate to the clean paths: '/' = home tab, '/login' = login screen.
    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, sessionLoading, segments, router]);

  // Notification tap → deep-link routing.
  // Notification data payload (set by send_push in the DB) contains a
  // `kind` and entity-specific id (decision_id, variation_id, etc.).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          string | undefined
        >;
        const kind = data?.kind;
        if (!kind) return;
        switch (kind) {
          case 'decision_raised':
          case 'decision_decided':
          case 'decision_needed':
            if (data.decision_id) router.push(`/decision/${data.decision_id}`);
            break;
          case 'variation_proposed':
          case 'variation_decided':
            if (data.variation_id) router.push(`/variation/${data.variation_id}`);
            break;
          case 'invoice_sent':
          case 'invoice_overdue':
          case 'invoice_paid':
            if (data.invoice_id) router.push(`/invoice/${data.invoice_id}`);
            break;
          case 'report_posted':
            if (data.report_id) router.push(`/report/${data.report_id}`);
            break;
          case 'update_posted':
          case 'stage_advanced':
            router.push('/updates');
            break;
          case 'message_received':
            router.push('/messages');
            break;
          default:
            // Unknown kind — open the app to home and leave the rest to
            // the user.
            router.push('/');
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  // Show a tiny splash while we wait for session + tenant on cold start.
  if (sessionLoading || (session && tenantLoading)) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="small" color={palette.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="compose-update"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="raise-decision"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="decision/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="variations"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="variation/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="propose-variation"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="invoices"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="invoice/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="create-invoice"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="reports"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="report/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="create-report"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="messages"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.canvas,
  },
});
