// ─── NotificationService.ts ──────────────────────────────────────────
// Fires a local push notification that appears OVER any running app
// or music — the closest available substitute to a system overlay on iOS.
//
// On iOS  → Banner at top of screen, plays alert sound, appears even
//            while another app is in the foreground.
// On Android → Heads-up notification (floating banner) with high
//              priority channel. Full overlay requires a dev build.
// ─────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AlertEvent } from '../context/AlertContext';

// ─── Alert Icons by event type ───────────────────────────────────────
const ALERT_ICONS: Record<string, string> = {
  horn:          '📯',
  dog:           '🐕',
  siren:         '🚨',
  name_detected: '👤',
};

// ─── Configure how notifications are displayed when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show banner even when app is open
    shouldPlaySound: true,   // play the ting
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Setup ────────────────────────────────────────────────────────────

/**
 * Request notification permissions and set up Android channel.
 * Call once on app mount.
 */
export async function setupNotifications(): Promise<boolean> {
  // Android: create a high-priority channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('aegis-alerts', {
      name: 'Aegis Safety Alerts',
      importance: Notifications.AndroidImportance.MAX, // heads-up floating banner
      sound: 'default',
      vibrationPattern: [0, 100, 50, 100, 50, 200], // strong buzz pattern
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true, // bypass Do Not Disturb for safety alerts
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      allowCriticalAlerts: true, // plays sound even on silent (iOS only, user must approve)
    },
  });

  return status === 'granted';
}

// ─── Fire Alert ───────────────────────────────────────────────────────

/**
 * Fire a local push notification for an alert event.
 * This appears over any running app including music players.
 */
export async function fireAlertNotification(event: AlertEvent): Promise<void> {
  const icon = ALERT_ICONS[event.type] ?? '⚠️';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${icon} AEGIS ALERT — ${event.label.toUpperCase()}`,
        body: `${event.decibels} dB detected${event.proximity ? ` · ${event.proximity}` : ''}`,
        sound: 'default',   // uses system alert sound (ting on iOS)
        priority: Notifications.AndroidNotificationPriority.MAX,
        // Vibration is handled separately by HapticsEngine for finer control
        data: { alertId: event.id, type: event.type },
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    // Gracefully degrade — notification failure should not break haptics
    console.warn('[Aegis] Notification failed:', err);
  }
}

/**
 * Dismiss all pending Aegis notifications (call on alert dismiss).
 */
export async function dismissAlertNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}
