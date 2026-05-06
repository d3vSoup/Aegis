// ─── AudioCapture.ts ─────────────────────────────────────────────────
// Aegis Live Microphone Intake Layer.
//
// Uses expo-av Audio.Recording for continuous 1-second PCM capture.
// For each chunk, RMS dB is computed and mapped to an alert type
// via a heuristic classifier — no TFLite required, works in Expo Go.
//
// UPGRADE PATH (after `npx expo run:ios`):
//   Replace this file with react-native-audio-record streaming.
//   AudioInference.ts, AlertContext.tsx stay untouched.
// ─────────────────────────────────────────────────────────────────────

import { Audio, type AudioMode } from 'expo-av';
import type { AlertEventType } from '../context/AlertContext';

// ─── Types ───────────────────────────────────────────────────────────

export interface LiveClassificationResult {
  type: AlertEventType;
  confidence: number;
  decibels: number;
}

type AudioCaptureCallback = (result: LiveClassificationResult) => void;

// ─── Internal State ──────────────────────────────────────────────────

let _recording: Audio.Recording | null = null;
let _captureLoop: ReturnType<typeof setTimeout> | null = null;
let _isCapturing = false;
let _callback: AudioCaptureCallback | null = null;
let _sensitivity = 68; // 0–100 — maps to dB floor adjustment

// ─── Audio Mode ───────────────────────────────────────────────────────

const AUDIO_MODE: AudioMode = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  interruptionModeIOS: 1,         // MixWithOthers
  interruptionModeAndroid: 1,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
};

// ─── Heuristic Classifier ─────────────────────────────────────────────
//
// Maps real microphone dB level to Aegis alert types.
//
// Sensitivity (0–100) shifts the dB floor by ±6 dB.
// Sensitivity 100 = triggers 6 dB quieter (more sensitive).
// Sensitivity 0   = triggers 6 dB louder (less sensitive).
//
// dB thresholds (adjusted by sensitivity):
//   > 85 dB  → siren        (confidence 0.88–0.95)
//   75–85 dB → horn         (confidence 0.80–0.92)
//   60–75 dB → dog          (confidence 0.72–0.85)
//   50–60 dB → name_detected (confidence 0.75–0.88)
//   < 50 dB  → null (silence, no event)

function classify(
  meteringDb: number,
  sensitivity: number,
): LiveClassificationResult | null {
  // Sensitivity shifts threshold floor by ±6 dB
  const sensitivityOffset = ((sensitivity - 50) / 100) * 6;
  const db = meteringDb - sensitivityOffset;

  const jitter = () => Math.random() * 0.12; // adds ±0–12% confidence noise

  if (db > 85) {
    return {
      type: 'siren',
      confidence: 0.88 + jitter(),
      decibels: Math.round(meteringDb),
    };
  }
  if (db > 75) {
    return {
      type: 'horn',
      confidence: 0.80 + jitter(),
      decibels: Math.round(meteringDb),
    };
  }
  if (db > 60) {
    return {
      type: 'dog',
      confidence: 0.72 + jitter(),
      decibels: Math.round(meteringDb),
    };
  }
  if (db > 50) {
    return {
      type: 'name_detected',
      confidence: 0.75 + jitter(),
      decibels: Math.round(meteringDb),
    };
  }

  return null; // Below threshold — silence
}

// ─── Capture Cycle ────────────────────────────────────────────────────
//
// Records a 1-second chunk, reads its metering status,
// classifies the dB level, then loops.

async function runCaptureCycle(): Promise<void> {
  if (!_isCapturing) return;

  try {
    // Re-assert recording audio mode before each cycle.
    // This is cheap and ensures the session is correct after any playback.
    await Audio.setAudioModeAsync(AUDIO_MODE);

    // Create and start a fresh 1-second recording
    const { recording } = await Audio.Recording.createAsync(
      {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      },
      (status) => {
        // Status fires ~every 200ms while recording
        if (!status.isRecording) return;

        const meteringDb = status.metering ?? -160;

        // expo-av metering returns values like -160 (silence) to ~0 (peak)
        // Convert to approximate SPL (add ~94 dB standard offset)
        const spl = meteringDb + 94;

        const result = classify(spl, _sensitivity);
        if (result && _callback) {
          _callback(result);
        }
      },
      200, // Status update interval in ms
    );

    _recording = recording;

    // Let it record for 1 second, then stop and loop
    _captureLoop = setTimeout(async () => {
      if (!_isCapturing) return;
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        // Recording may have already stopped
      }
      _recording = null;
      // Immediately start next cycle
      runCaptureCycle();
    }, 1000);

  } catch {
    // If recording fails (session hijacked, hardware busy), back off and retry
    if (_isCapturing) {
      _captureLoop = setTimeout(() => runCaptureCycle(), 500);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Initialize microphone permissions and audio session.
 * Call this once on app mount (AlertProvider).
 */
export async function initAudioCapture(): Promise<boolean> {
  try {
    await Audio.setAudioModeAsync(AUDIO_MODE);
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Start continuous microphone capture.
 * Each 1-second chunk fires the callback with a ClassificationResult
 * if the audio energy exceeds the sensitivity-adjusted threshold.
 */
export function startAudioCapture(
  callback: AudioCaptureCallback,
  sensitivity = 68,
): void {
  if (_isCapturing) return;
  _isCapturing = true;
  _callback = callback;
  _sensitivity = sensitivity;
  runCaptureCycle();
}

/**
 * Stop microphone capture immediately.
 */
export async function stopAudioCapture(): Promise<void> {
  _isCapturing = false;
  _callback = null;

  if (_captureLoop) {
    clearTimeout(_captureLoop);
    _captureLoop = null;
  }

  if (_recording) {
    try {
      await _recording.stopAndUnloadAsync();
    } catch {
      // Already stopped
    }
    _recording = null;
  }
}

/**
 * Update sensitivity while capture is running.
 */
export function setCaptureSensitivity(sensitivity: number): void {
  _sensitivity = sensitivity;
}

export function isCapturing(): boolean {
  return _isCapturing;
}

/**
 * Suspend capture so the audio session can be handed to a sound player.
 * Stops the current recording and clears the loop — does NOT set
 * _isCapturing to false, so resumeAfterPlayback() can restart cleanly.
 */
export async function suspendCaptureForPlayback(): Promise<void> {
  if (_captureLoop) {
    clearTimeout(_captureLoop);
    _captureLoop = null;
  }
  if (_recording) {
    try {
      await _recording.stopAndUnloadAsync();
    } catch {
      // Already unloaded
    }
    _recording = null;
  }
}

/**
 * Resume capture after a sound has finished playing.
 * Re-asserts recording audio mode and restarts the cycle.
 */
export function resumeCaptureAfterPlayback(): void {
  if (!_isCapturing) return; // was stopped entirely — don't restart
  // Small delay to let the audio session fully release
  setTimeout(() => runCaptureCycle(), 300);
}

/**
 * Restore the recording audio mode without restarting the capture cycle.
 * Useful to call before resumeCaptureAfterPlayback.
 */
export async function restoreRecordingAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync(AUDIO_MODE);
  } catch {
    // ignore
  }
}
