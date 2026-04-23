// ─── StorageService.ts ───────────────────────────────────────────────
// Persistence layer for Project Aegis.
// All alert history is stored locally via AsyncStorage.
// No data ever leaves the device — 100% on-device privacy.
// ─────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertEvent } from '../context/AlertContext';

const KEYS = {
  ALERT_HISTORY:  'aegis_alert_history',
  ONBOARDED:      'aegis_onboarded',
  USER_NAME:      'aegis_user_name',
  SENSITIVITY:    'aegis_sensitivity',
} as const;

// ─── History ─────────────────────────────────────────────────────────

/**
 * Persist the full alert history to storage.
 * Timestamps are serialised as ISO strings and restored on load.
 */
export async function saveHistory(history: AlertEvent[]): Promise<void> {
  try {
    const serialised = JSON.stringify(history);
    await AsyncStorage.setItem(KEYS.ALERT_HISTORY, serialised);
  } catch (e) {
    console.warn('[StorageService] Failed to save history:', e);
  }
}

/**
 * Load alert history from storage.
 * Returns an empty array if nothing is stored yet.
 * Deserialises ISO timestamp strings back to Date objects.
 */
export async function loadHistory(): Promise<AlertEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ALERT_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<AlertEvent & { timestamp: string }>;
    return parsed.map((event) => ({
      ...event,
      timestamp: new Date(event.timestamp),
    }));
  } catch (e) {
    console.warn('[StorageService] Failed to load history:', e);
    return [];
  }
}

/**
 * Wipe all stored alert history.
 */
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.ALERT_HISTORY);
  } catch (e) {
    console.warn('[StorageService] Failed to clear history:', e);
  }
}

// ─── Onboarding ───────────────────────────────────────────────────────

/**
 * Returns true if the user has already completed onboarding.
 */
export async function hasOnboarded(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as complete. Called from the onboarding screen's final CTA.
 */
export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
  } catch (e) {
    console.warn('[StorageService] Failed to mark onboarded:', e);
  }
}

// ─── User Preferences ────────────────────────────────────────────────

export async function saveUserName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_NAME, name);
  } catch {}
}

export async function loadUserName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(KEYS.USER_NAME)) ?? '';
  } catch {
    return '';
  }
}

export async function saveSensitivity(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SENSITIVITY, String(value));
  } catch {}
}

export async function loadSensitivity(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(KEYS.SENSITIVITY);
    return val !== null ? Number(val) : 68; // default
  } catch {
    return 68;
  }
}

/**
 * Nuclear option: wipe all Aegis data.
 */
export async function resetAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.warn('[StorageService] Failed to reset all:', e);
  }
}
