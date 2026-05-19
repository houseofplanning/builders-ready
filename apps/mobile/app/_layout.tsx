import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
