import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Two stores, deliberately.
 *
 * Tokens go to the Keychain / Keystore via expo-secure-store — hardware-backed
 * where the device supports it, and never readable by another app or by a
 * backup. AsyncStorage is an unencrypted file, so a refresh token in it is a
 * session anyone with the device can lift.
 *
 * Everything else — the active business, sync cursors, preferences — is not
 * sensitive and goes to AsyncStorage, which is faster and has no size limit.
 *
 * `react-native-mmkv` is deliberately absent until Phase 3: it is not in Expo
 * Go, so adopting it now would force development builds before the fast
 * iteration loop has earned that cost. See docs/device-testing.md.
 */

const ACCESS_TOKEN = 'daybook.accessToken';
const REFRESH_TOKEN = 'daybook.refreshToken';
const ACTIVE_BUSINESS = 'daybook.activeBusinessId';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN),
    SecureStore.getItemAsync(REFRESH_TOKEN),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
  ]);
}

/** Not sensitive: which business was open last, so the app reopens where it was. */
export async function saveActiveBusinessId(businessId: string | null): Promise<void> {
  if (businessId === null) {
    await AsyncStorage.removeItem(ACTIVE_BUSINESS);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_BUSINESS, businessId);
}

export async function loadActiveBusinessId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_BUSINESS);
}
