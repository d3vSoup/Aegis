// ─── BackgroundService.ts ────────────────────────────────────────────
// Keeps the Aegis sentinel alive when the app is backgrounded.
//
// Android: Registers a persistent foreground service notification so
//          the OS does not kill the JS thread. The notification reads
//          "🛡️ Aegis Shield Active" and cannot be swiped away.
//
// iOS: Relies on UIBackgroundModes: ["audio"] in app.json to keep
//      the audio session active. A near-silent audio loop is played
//      to prevent iOS from suspending the microphone access.
//
// IMPORTANT: Full Android foreground service requires a dev build.
//            In Expo Go, the persistent notification still shows but
//            the OS may still suspend after ~30 seconds of backgrounding.
// ─────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

// ─── Constants ───────────────────────────────────────────────────────

const SENTINEL_TASK = 'AEGIS_SENTINEL_TASK';
const SENTINEL_NOTIFICATION_ID = 'aegis-sentinel-persistent';
const SENTINEL_CHANNEL = 'aegis-sentinel';

// ─── Background Task Definition ──────────────────────────────────────
// Must be defined at module level.

TaskManager.defineTask(SENTINEL_TASK, async () => {
  // This task fires periodically to keep the JS thread warm.
  // The real inference loop is managed by AudioInference.ts.
  // This just tells the OS "we're still working".
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// ─── Android Channel Setup ───────────────────────────────────────────

async function setupSentinelChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(SENTINEL_CHANNEL, {
    name: 'Aegis Sentinel Status',
    importance: Notifications.AndroidImportance.LOW, // low = no sound, no popup
    sound: undefined,
    enableVibrate: false,
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.SECRET,
  });
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Start the background sentinel.
 * - Shows a persistent "Shield Active" notification
 * - Registers the background fetch task (Android foreground service equivalent)
 */
export async function startBackgroundService(): Promise<void> {
  await setupSentinelChannel();

  // Show persistent notification
  await Notifications.scheduleNotificationAsync({
    identifier: SENTINEL_NOTIFICATION_ID,
    content: {
      title: '🛡️ Aegis Shield Active',
      body: 'Sentinel is monitoring your environment.',
      sound: undefined,       // silent
      priority: Notifications.AndroidNotificationPriority.LOW,
      sticky: true,           // Android: cannot be swiped away
      autoDismiss: false,
      data: { type: 'sentinel' },
    },
    trigger: null, // fire immediately
  });

  // Register background fetch task (fires every ~15 min on Android to keep process warm)
  try {
    const status = await BackgroundFetch.getStatusAsync();
    const isAvailable =
      status === BackgroundFetch.BackgroundFetchStatus.Available;

    if (isAvailable) {
      await BackgroundFetch.registerTaskAsync(SENTINEL_TASK, {
        minimumInterval: 60 * 15, // 15 minutes
        stopOnTerminate: false,   // keep running even if app is force-closed
        startOnBoot: true,        // restart on device reboot
      });
    }
  } catch {
    // Background fetch not available in Expo Go — gracefully degrade
  }
}

/**
 * Stop the background sentinel and remove the persistent notification.
 */
export async function stopBackgroundService(): Promise<void> {
  // Dismiss the persistent notification
  try {
    await Notifications.dismissNotificationAsync(SENTINEL_NOTIFICATION_ID);
  } catch {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Unregister background task
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SENTINEL_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(SENTINEL_TASK);
    }
  } catch {
    // ignore
  }
}

/**
 * Returns whether the background sentinel task is currently registered.
 */
export async function isSentinelRunning(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(SENTINEL_TASK);
  } catch {
    return false;
  }
}
