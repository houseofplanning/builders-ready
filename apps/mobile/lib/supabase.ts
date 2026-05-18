import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeSupabaseClient } from '@br/shared';
import Constants from 'expo-constants';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.SUPABASE_URL;
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in apps/mobile/.env',
  );
}

export const supabase = makeSupabaseClient({
  url,
  anonKey,
  storage: AsyncStorage,
  persistSession: true,
  detectSessionInUrl: false,
});
