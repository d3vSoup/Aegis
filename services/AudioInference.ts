// ─── AudioInference.ts ───────────────────────────────────────────────
// The Aegis Audio Intelligence Layer.
//
// ARCHITECTURE:
//   Microphone Buffer → Mel-Spectrogram → TFLite YAMNet → Classification
//
// STATUS:
//   The full pipeline is wired and ready. TFLite model call is stubbed
//   with a realistic mock emitter.
//
// TO ACTIVATE REAL INFERENCE (requires dev build):
//   1. Run: npx expo run:android (or run:ios on Mac)
//   2. Install: npm install react-native-fast-tflite react-native-audio-record
//   3. Place yamnet_int8.tflite in /assets/models/yamnet_int8.tflite
//   4. Uncomment the REAL INFERENCE SECTION below
//   5. Comment out the MOCK SECTION below
// ─────────────────────────────────────────────────────────────────────

import type { AlertEventType } from '../context/AlertContext';
import {
  CONFIDENCE_THRESHOLDS,
  INFERENCE_INTERVAL_MS,
  ALERT_DEBOUNCE_MS,
  AUDIO_SAMPLE_RATE,
  AUDIO_BUFFER_SIZE_MS,
} from '../constants/AcousticTiers';
import { classifyYAMNetOutput } from '../constants/YAMNetClasses';
import { melSpectrogram, base64PcmToFloat32 } from '../utils/MelSpectrogram';
import { applyActivityMultipliers, getCurrentMultipliers } from '../services/ActivityService';

// ─── Types ───────────────────────────────────────────────────────────

export interface ClassificationResult {
  type: AlertEventType;
  confidence: number;
  decibels: number;
}

type InferenceCallback = (result: ClassificationResult) => void;

// ─── Internal State ──────────────────────────────────────────────────

let inferenceTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
const lastAlertTime: Partial<Record<AlertEventType, number>> = {};

// PCM rolling buffer (for when real audio record is active)
let _pcmBuffer: Float32Array = new Float32Array(
  Math.ceil((AUDIO_SAMPLE_RATE * AUDIO_BUFFER_SIZE_MS) / 1000),
);
let _bufferFilled = false;

// ─── Debounce ────────────────────────────────────────────────────────

function isDebounced(type: AlertEventType): boolean {
  const last = lastAlertTime[type];
  if (!last) return false;
  return Date.now() - last < ALERT_DEBOUNCE_MS;
}

function markAlertFired(type: AlertEventType): void {
  lastAlertTime[type] = Date.now();
}

// ─── PCM Buffer Management ────────────────────────────────────────────

/**
 * Called by react-native-audio-record's 'data' event with base64 PCM.
 * Accumulates samples into a rolling buffer for inference.
 */
export function feedAudioChunk(base64Chunk: string): void {
  const samples = base64PcmToFloat32(base64Chunk);
  const buf = _pcmBuffer;
  // Shift old samples left, append new ones
  if (samples.length >= buf.length) {
    _pcmBuffer = samples.slice(samples.length - buf.length);
  } else {
    _pcmBuffer = new Float32Array(buf.length);
    _pcmBuffer.set(buf.subarray(samples.length));
    _pcmBuffer.set(samples, buf.length - samples.length);
  }
  _bufferFilled = true;
}

// ─── RMS → dB Helper ─────────────────────────────────────────────────

function rmsToDb(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  return Math.round(20 * Math.log10(Math.max(rms, 1e-10)) + 94); // SPL offset
}

// ─── ─── ─── MOCK SECTION ─── ─── ─────────────────────────────────────
// Realistic simulation while TFLite is not yet wired in.
// Delete this block once REAL INFERENCE SECTION is activated.

const EVENT_TYPES: AlertEventType[] = ['siren', 'horn', 'dog', 'name_detected'];
const EVENT_DB_RANGES: Record<AlertEventType, [number, number]> = {
  siren:         [85, 105],
  horn:          [75,  95],
  dog:           [60,  80],
  name_detected: [50,  70],
};

function runMockInference(): ClassificationResult | null {
  if (Math.random() < 0.80) return null;
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const [minDb, maxDb] = EVENT_DB_RANGES[type];
  const confidence = 0.70 + Math.random() * 0.30;
  return {
    type,
    confidence,
    decibels: Math.round(minDb + Math.random() * (maxDb - minDb)),
  };
}
// ─── ─── ─── END MOCK ─── ─── ─────────────────────────────────────────

// ─── ─── ─── REAL INFERENCE SECTION (uncomment for dev build) ─────────
// import { loadTensorflowModel } from 'react-native-fast-tflite';
// import AudioRecord from 'react-native-audio-record';
//
// let _model: any = null;
//
// async function initModel(): Promise<void> {
//   _model = await loadTensorflowModel(
//     require('../assets/models/yamnet_int8.tflite')
//   );
// }
//
// function startAudioRecord(onChunk: (base64: string) => void): void {
//   AudioRecord.init({
//     sampleRate: AUDIO_SAMPLE_RATE,
//     channels: 1,
//     bitsPerSample: 16,
//     audioSource: 6, // VOICE_RECOGNITION (Android) — cleaner mic
//     wavFile: '',
//   });
//   AudioRecord.on('data', onChunk);
//   AudioRecord.start();
// }
//
// async function runRealInference(): Promise<ClassificationResult | null> {
//   if (!_model || !_bufferFilled) return null;
//   const spectrogram = melSpectrogram(_pcmBuffer);
//   const input = new Float32Array([...spectrogram]);
//   const output = await _model.run([input]);
//   const scores = output[0] as Float32Array;
//   const decibels = rmsToDb(_pcmBuffer);
//   const result = classifyYAMNetOutput(scores);
//   if (!result) return null;
//   return { type: result.type, confidence: result.confidence, decibels };
// }
// ─── ─── ─── END REAL INFERENCE ─── ─── ──────────────────────────────

// ─── Public API ──────────────────────────────────────────────────────

export function startInference(
  onResult: InferenceCallback,
  sensitivity = 68,
): void {
  if (isRunning) return;
  isRunning = true;

  const sensitivityMultiplier = 1 - ((sensitivity - 50) / 100) * 0.3;

  inferenceTimer = setInterval(async () => {
    // ── MOCK: replace runMockInference() with runRealInference() for dev build
    const result = runMockInference();
    // ── END MOCK

    if (!result) return;

    // Apply both user sensitivity AND activity-based adaptive multipliers
    const activityMultipliers = getCurrentMultipliers();
    const adaptedThresholds = applyActivityMultipliers(
      CONFIDENCE_THRESHOLDS,
      activityMultipliers,
    );

    const threshold = adaptedThresholds[result.type] * sensitivityMultiplier;
    if (result.confidence < threshold) return;
    if (isDebounced(result.type)) return;

    markAlertFired(result.type);
    onResult(result);
  }, INFERENCE_INTERVAL_MS);
}

export function stopInference(): void {
  if (inferenceTimer) {
    clearInterval(inferenceTimer);
    inferenceTimer = null;
  }
  isRunning = false;
}

export function isInferenceRunning(): boolean {
  return isRunning;
}
