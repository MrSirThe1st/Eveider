import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Set them in the repo root .env (see .env.example) and run: pnpm --filter @eveider/mobile dev',
  );
}

const webStorage = {
  getItem: (storageKey: string) => {
    if (typeof localStorage === 'undefined') return Promise.resolve(null);
    return Promise.resolve(localStorage.getItem(storageKey));
  },
  setItem: (storageKey: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, value);
    return Promise.resolve();
  },
  removeItem: (storageKey: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey);
    return Promise.resolve();
  },
};

export const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    storageKey: 'eveider-mobile-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const authApiUrl =
  process.env.EXPO_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000';
