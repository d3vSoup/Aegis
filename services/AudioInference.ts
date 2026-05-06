// ─── AudioInference.ts ───────────────────────────────────────────────
// The Aegis Audio Intelligence Layer.
//
// ARCHITECTURE:
//   Microphone (expo-av) → dB Metering → Heuristic Classifier → Alert
//
// STATUS:
//   Full pipeline is live using expo-av Audio.Recording.
//   Works in Expo Go — no native rebuild required.
//
// UPGRADE PATH (to real TFLite — after `npx expo run:ios`):
//   1. Replace AudioCapture.ts with react-native-audio-record streaming
//   2. Compute Mel spectrogram in MelSpectrogram.ts
//   3. Load yamnet_int8.tflite with react-native-fast-tflite
//   4. Feed spectrogram tensor → read output scores
//   5. Run classifyYAMNetOutput(scores) instead of the heuristic
//   Everything else (debounce, thresholds, AlertContext) stays identical.
// ─────────────────────────────────────────────────────────────────────

import type { AlertEventType } from '../context/AlertContext';
import {
  CONFIDENCE_THRESHOLDS,
  ALERT_DEBOUNCE_MS,
} from '../constants/AcousticTiers';
import { applyActivityMultipliers, getCurrentMultipliers } from '../services/ActivityService';
import {
  initAudioCapture,
  startAudioCapture,
  stopAudioCapture,
} from '../services/AudioCapture';

// ─── Types ───────────────────────────────────────────────────────────

export interface ClassificationResult {
  type: AlertEventType;
  confidence: number;
  decibels: number;
}

type InferenceCallback = (result: ClassificationResult) => void;

// ─── Internal State ──────────────────────────────────────────────────

let isRunning = false;
const lastAlertTime: Partial<Record<AlertEventType, number>> = {};
let _globalLastAlertTime = 0;
const GLOBAL_COOLDOWN_MS = 5000; // Min time between ANY alerts (all types)

// ─── Debounce ────────────────────────────────────────────────────────

function isDebounced(type: AlertEventType): boolean {
  const now = Date.now();
  // Global cooldown — no alert of ANY type within 5s of the last one
  if (now - _globalLastAlertTime < GLOBAL_COOLDOWN_MS) return true;
  // Per-type debounce — same type can't repeat within ALERT_DEBOUNCE_MS
  const last = lastAlertTime[type];
  if (!last) return false;
  return now - last < ALERT_DEBOUNCE_MS;
}

function markAlertFired(type: AlertEventType): void {
  const now = Date.now();
  lastAlertTime[type] = now;
  _globalLastAlertTime = now;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Initialize the audio hardware and request microphone permissions.
 * Call this once on app mount (AlertProvider.useEffect).
 * Returns true if permission was granted.
 */
export async function initInference(): Promise<boolean> {
  return initAudioCapture();
}

/**
 * Start live audio capture and inference.
 * Each captured audio chunk that exceeds the sensitivity threshold
 * fires onResult with the classified alert type.
 */
export function startInference(
  onResult: InferenceCallback,
  sensitivity = 68,
): void {
  if (isRunning) return;
  isRunning = true;

  const sensitivityMultiplier = 1 - ((sensitivity - 50) / 100) * 0.3;

  startAudioCapture((raw) => {
    // Apply user sensitivity AND live activity-based adaptive multipliers
    const activityMultipliers = getCurrentMultipliers();
    const adaptedThresholds = applyActivityMultipliers(
      CONFIDENCE_THRESHOLDS,
      activityMultipliers,
    );

    const threshold = adaptedThresholds[raw.type] * sensitivityMultiplier;

    if (raw.confidence < threshold) return;
    if (isDebounced(raw.type)) return;

    markAlertFired(raw.type);
    onResult(raw);
  }, sensitivity);
}

/**
 * Stop live audio capture and inference.
 */
export function stopInference(): void {
  isRunning = false;
  stopAudioCapture();
}

export function isInferenceRunning(): boolean {
  return isRunning;
}

// ─── Legacy PCM buffer API (kept for future TFLite path) ─────────────
// feedAudioChunk() will be used again when react-native-audio-record
// streams raw PCM. Kept here to avoid import errors in any callers.

let _pcmBuffer: Float32Array = new Float32Array(15600); // 975ms @ 16kHz
let _bufferFilled = false;

export function feedAudioChunk(_base64Chunk: string): void {
  // No-op until TFLite path is active.
  // When react-native-audio-record is integrated, restore:
  //   const samples = base64PcmToFloat32(_base64Chunk);
  //   ... rolling buffer logic ...
  _bufferFilled = false; // suppress unused warning
}
