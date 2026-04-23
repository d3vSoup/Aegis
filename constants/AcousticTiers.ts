// ─── AcousticTiers.ts ────────────────────────────────────────────────
// Centralised constants for the Aegis audio classification pipeline.
// These values govern when the inference engine fires a haptic alert.
// ─────────────────────────────────────────────────────────────────────

import type { AlertEventType } from '../context/AlertContext';

// ─── Confidence Thresholds ───────────────────────────────────────────
// The minimum model output probability (0–1) required to trigger an alert.
// Higher values = fewer false positives. Tune these during calibration.
export const CONFIDENCE_THRESHOLDS: Record<AlertEventType, number> = {
  siren:         0.85, // Emergency vehicles — high confidence required
  horn:          0.90, // Car horns — must be very distinct
  dog:           0.70, // Dog barks — lower threshold; less safety-critical
  name_detected: 0.80, // Name detection — personal trigger
};

// ─── Inference Polling Rate ───────────────────────────────────────────
// How often (in ms) the audio buffer is sampled and fed to the model.
// Lower = more responsive but higher CPU/battery cost.
export const INFERENCE_INTERVAL_MS = 500;

// ─── Mock Simulation Rate ────────────────────────────────────────────
// How frequently the demo/simulation mode generates a mock alert.
// Used when TFLite is not yet wired in.
export const SIMULATION_INTERVAL_MS = 4000;

// ─── Debounce ────────────────────────────────────────────────────────
// Minimum time (ms) between two alerts of the same type.
// Prevents a 10-second siren from firing 20 haptic sequences.
export const ALERT_DEBOUNCE_MS = 3000;

// ─── Decibel Tiers ───────────────────────────────────────────────────
// Labels displayed in the UI for contextual dB readings.
export type DbTierLabel = 'SAFE' | 'MODERATE' | 'HAZARDOUS' | 'CRITICAL';

export function getDbTier(decibels: number): DbTierLabel {
  if (decibels < 60)  return 'SAFE';
  if (decibels < 75)  return 'MODERATE';
  if (decibels < 90)  return 'HAZARDOUS';
  return 'CRITICAL';
}

export function getDbTierColor(tier: DbTierLabel): string {
  switch (tier) {
    case 'SAFE':      return '#4CAF50';
    case 'MODERATE':  return '#FFD700';
    case 'HAZARDOUS': return '#FF9800';
    case 'CRITICAL':  return '#FF4444';
  }
}

// ─── Mel-Spectrogram Config (for future TFLite integration) ──────────
// These match the input tensor shape expected by the YAMNet / MobileNetV2 model.
export const AUDIO_SAMPLE_RATE = 16000;       // Hz
export const AUDIO_BUFFER_SIZE_MS = 975;      // ms of audio per inference frame
export const MEL_BINS = 64;                   // Mel-filter bank channels
export const MEL_FRAMES = 96;                 // Time frames per spectrogram
export const MODEL_INPUT_SHAPE = [1, MEL_FRAMES, MEL_BINS, 1] as const;
