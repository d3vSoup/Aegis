// ─── ActivityService.ts ───────────────────────────────────────────────
// Adaptive sensitivity: uses GPS speed to detect if the user is in a
// vehicle and automatically dampens horn/siren thresholds to reduce
// alert fatigue from expected traffic noise.
//
// Speed tiers:
//   < 5 km/h   → STATIONARY — full default sensitivity
//   5–30 km/h  → WALKING/CYCLING — slight dampening on horn
//   > 30 km/h  → IN VEHICLE — dampen horn by 30%, siren by 15%
// ─────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';
import type { AlertEventType } from '../context/AlertContext';

// ─── Types ───────────────────────────────────────────────────────────

export type ActivityState = 'stationary' | 'walking' | 'vehicle';

export interface SensitivityMultipliers {
  horn: number;
  siren: number;
  dog: number;
  name_detected: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000; // poll speed every 10 seconds
const VEHICLE_SPEED_KMH = 30;
const WALKING_SPEED_KMH = 5;

// Threshold multipliers: >1 = harder to trigger (dampened), <1 = easier
const MULTIPLIERS_BY_ACTIVITY: Record<ActivityState, SensitivityMultipliers> = {
  stationary: { horn: 1.0, siren: 1.0, dog: 1.0, name_detected: 1.0 },
  walking:    { horn: 1.1, siren: 1.0, dog: 1.0, name_detected: 1.0 },
  vehicle:    { horn: 1.3, siren: 1.15, dog: 1.0, name_detected: 1.0 },
};

// ─── State ───────────────────────────────────────────────────────────

let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _currentActivity: ActivityState = 'stationary';
let _onActivityChange: ((activity: ActivityState, multipliers: SensitivityMultipliers) => void) | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────

function mpsToKmh(mps: number): number {
  return mps * 3.6;
}

function classifySpeed(speedMps: number | null): ActivityState {
  if (speedMps == null || speedMps < 0) return 'stationary';
  const kmh = mpsToKmh(speedMps);
  if (kmh >= VEHICLE_SPEED_KMH) return 'vehicle';
  if (kmh >= WALKING_SPEED_KMH) return 'walking';
  return 'stationary';
}

async function pollActivity(): Promise<void> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const newActivity = classifySpeed(loc.coords.speed);

    if (newActivity !== _currentActivity) {
      _currentActivity = newActivity;
      if (_onActivityChange) {
        _onActivityChange(newActivity, MULTIPLIERS_BY_ACTIVITY[newActivity]);
      }
    }
  } catch {
    // GPS unavailable — keep last known state
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Start polling GPS speed and fire the callback whenever activity changes.
 */
export function startActivityMonitoring(
  onChange: (activity: ActivityState, multipliers: SensitivityMultipliers) => void,
): void {
  if (_pollTimer) return;

  _onActivityChange = onChange;
  _currentActivity = 'stationary';

  // Poll immediately, then on interval
  pollActivity();
  _pollTimer = setInterval(pollActivity, POLL_INTERVAL_MS);
}

/**
 * Stop activity monitoring.
 */
export function stopActivityMonitoring(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  _onActivityChange = null;
}

/**
 * Get the current activity state.
 */
export function getCurrentActivity(): ActivityState {
  return _currentActivity;
}

/**
 * Get the current sensitivity multipliers for the active activity.
 */
export function getCurrentMultipliers(): SensitivityMultipliers {
  return MULTIPLIERS_BY_ACTIVITY[_currentActivity];
}

/**
 * Apply activity multipliers on top of user's base confidence thresholds.
 * Returns adjusted thresholds per event type.
 */
export function applyActivityMultipliers(
  baseThresholds: Record<AlertEventType, number>,
  multipliers: SensitivityMultipliers,
): Record<AlertEventType, number> {
  return {
    horn:          Math.min(0.99, baseThresholds.horn          * multipliers.horn),
    siren:         Math.min(0.99, baseThresholds.siren         * multipliers.siren),
    dog:           Math.min(0.99, baseThresholds.dog           * multipliers.dog),
    name_detected: Math.min(0.99, baseThresholds.name_detected * multipliers.name_detected),
  };
}
