import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Push-notification helpers.
 *
 * Flow:
 *   1. Set the foreground notification handler so notifications received
 *      while the app is open still show as banners.
 *   2. On sign-in (called by TenantProvider once a tenant resolves), ask
 *      for permission, get the Expo Push Token, upsert into push_tokens.
 *   3. Migrations 7 / 9 / 11 trigger send_push on relevant DB writes,
 *      which POSTs to Expo's API via pg_net; the device gets the push.
 */

// Configure how the OS treats notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

export async function readPushPermission(): Promise<PushPermissionStatus> {
  const settings = await Notifications.getPermissionsAsync();
  return {
    granted: settings.status === 'granted',
    canAskAgain: settings.canAskAgain,
    status: settings.status,
  };
}

/**
 * Idempotent: safe to call every time the app loads. Will upsert the
 * device's current token into push_tokens for the given user/tenant.
 * Returns null on simulator / web / denied permission.
 */
export async function registerForPushNotifications(params: {
  userId: string;
  tenantId: string;
}): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  // Ask for permission if we haven't been granted yet.
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    if (!existing.canAskAgain) {
      // User has denied; they need to enable in OS settings.
      return null;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  let token: string | null = null;
  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = result.data;
  } catch (err) {
    // Common on simulator without push entitlements — non-fatal.
    console.warn('getExpoPushTokenAsync failed:', err);
    return null;
  }
  if (!token) return null;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  // Upsert via composite primary key (user_id, expo_token). If this
  // user already has this token for a different tenant, the row gets
  // overwritten to reflect the current tenant.
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        tenant_id: params.tenantId,
        user_id: params.userId,
        expo_token: token,
        platform,
      },
      { onConflict: 'user_id,expo_token' },
    );
  if (error) {
    console.warn('push_tokens upsert failed:', error.message);
    return null;
  }
  return token;
}

/**
 * Remove the device's token on sign-out so we don't keep pushing to a
 * phone that no longer belongs to that user.
 */
export async function deregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = result.data;
    if (!token) return;
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_token', token);
  } catch {
    // Ignore — best-effort cleanup.
  }
}
