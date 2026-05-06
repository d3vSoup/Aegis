// ─── AudioCapture.ts ─────────────────────────────────────────────────
// Aegis Live Microphone Intake Layer.
//
// Strategy: RECORDING ONLY. No audio playback ever happens through this
// service. TingAlert visual overlay + haptics handle user notification.
// This gives us a permanent, unbreakable mic capture loop.
//
// Architecture:
//   - 1-second recording chunks, metering every 200ms
//   - Watchdog timer restarts the loop if it ever silently dies
//   - Audio session is NEVER switched away from recording mode
// ─────────────────────────────────────────────────────────────────────

import { Audio } from 'expo-av';
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
let _cycleTimer: ReturnType<typeof setTimeout> | null = null;
let _watchdogTimer: ReturnType<typeof setInterval> | null = null;
let _isCapturing = false;
let _callback: AudioCaptureCallback | null = null;
let _sensitivity = 68;
let _lastCycleAt = 0;  // timestamp of last successful cycle start

// ─── Recording-only audio mode ────────────────────────────────────────
// This mode is set ONCE on init and NEVER changed.
// Changing it mid-session is what causes the mic to die.

const RECORDING_MODE = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  interruptionModeIOS: 1,          // DoNotMix
  interruptionModeAndroid: 1,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
} as const;

// ─── Heuristic Classifier ─────────────────────────────────────────────
// expo-av metering: -160 (silence) → ~0 (peak clipping)
// + 94 offset → approximate SPL in dB
//
// dB → alert type mapping (sensitivity shifts floor ±6 dB):
//   > 85 → siren         confidence 0.88–1.00
//   > 75 → horn          confidence 0.80–0.92
//   > 60 → dog           confidence 0.72–0.84
//   > 50 → name_detected confidence 0.75–0.87
//   ≤ 50 → null (silence)

function classify(
  meteringDb: number,
  sensitivity: number,
): LiveClassificationResult | null {
  const offset = ((sensitivity - 50) / 100) * 6; // ±6 dB shift
  const db = meteringDb - offset;
  const jitter = () => Math.random() * 0.10;

  // Thresholds calibrated for real phone mic in expo-av:
  //   expo-av metering is dBFS (-160→0), +94 ≈ SPL.
  //   But real readings in a room are typically 40–80 dB on this scale.
  //   Siren > 72 → only very loud continuous sounds (YouTube siren)
  //   Horn  > 62 → clap near mic, car horn from video
  //   Dog   > 50 → dog bark, medium hand clap
  //   Name  > 35 → normal speaking voice, any detectable sound

  if (db > 72) return { type: 'siren',        confidence: 0.90 + jitter(), decibels: Math.round(meteringDb) };
  if (db > 62) return { type: 'horn',          confidence: 0.82 + jitter(), decibels: Math.round(meteringDb) };
  if (db > 50) return { type: 'dog',           confidence: 0.74 + jitter(), decibels: Math.round(meteringDb) };
  if (db > 35) return { type: 'name_detected', confidence: 0.77 + jitter(), decibels: Math.round(meteringDb) };
  return null;
}

// ─── Core Capture Cycle ───────────────────────────────────────────────
// Runs a 1-second recording chunk. On completion, immediately schedules
// the next cycle. Any error causes a 300ms backoff then retry.

async function runCycle(): Promise<void> {
  if (!_isCapturing) return;

  _lastCycleAt = Date.now();

  let rec: Audio.Recording | null = null;

  try {
    const { recording } = await Audio.Recording.createAsync(
      { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
      (status) => {
        if (!_isCapturing) return;
        if (!status.isRecording) return;

        const spl = (status.metering ?? -160) + 94;
        const result = classify(spl, _sensitivity);
        if (result && _callback) {
          _callback(result);
        }
      },
      200,
    );

    rec = recording;
    _recording = rec;

    // Record for 950ms, then stop and immediately loop
    _cycleTimer = setTimeout(async () => {
      _recording = null;
      try {
        await rec!.stopAndUnloadAsync();
      } catch {
        // Already stopped — fine
      }
      // Next cycle immediately
      if (_isCapturing) runCycle();
    }, 950);

  } catch {
    // createAsync failed (session busy, permissions revoked, etc.)
    // Back off 300ms and retry
    _recording = null;
    if (rec) {
      try { await rec.stopAndUnloadAsync(); } catch {}
    }
    if (_isCapturing) {
      _cycleTimer = setTimeout(() => runCycle(), 300);
    }
  }
}

// ─── Watchdog ─────────────────────────────────────────────────────────
// Checks every 3 seconds that a cycle started within the last 2.5s.
// If the loop silently died, it force-restarts it.

function startWatchdog(): void {
  stopWatchdog();
  _watchdogTimer = setInterval(() => {
    if (!_isCapturing) return;
    const age = Date.now() - _lastCycleAt;
    if (age > 2500) {
      // Loop appears dead — force restart
      if (_cycleTimer) { clearTimeout(_cycleTimer); _cycleTimer = null; }
      if (_recording) {
        _recording.stopAndUnloadAsync().catch(() => {});
        _recording = null;
      }
      runCycle();
    }
  }, 3000);
}

function stopWatchdog(): void {
  if (_watchdogTimer) {
    clearInterval(_watchdogTimer);
    _watchdogTimer = null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Initialize microphone permissions and lock the audio session into
 * recording mode. Call once on app mount. Returns true if granted.
 */
export async function initAudioCapture(): Promise<boolean> {
  try {
    await Audio.setAudioModeAsync(RECORDING_MODE);
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Start continuous mic capture. Fires callback for every chunk that
 * exceeds the sensitivity-adjusted dB threshold.
 */
export function startAudioCapture(
  callback: AudioCaptureCallback,
  sensitivity = 68,
): void {
  if (_isCapturing) return;
  _isCapturing = true;
  _callback = callback;
  _sensitivity = sensitivity;
  runCycle();
  startWatchdog();
}

/**
 * Stop mic capture fully. Cleans up all timers and the active recording.
 */
export async function stopAudioCapture(): Promise<void> {
  _isCapturing = false;
  _callback = null;
  stopWatchdog();

  if (_cycleTimer) { clearTimeout(_cycleTimer); _cycleTimer = null; }

  if (_recording) {
    try { await _recording.stopAndUnloadAsync(); } catch {}
    _recording = null;
  }
}

/**
 * Update sensitivity live while capture is running.
 */
export function setCaptureSensitivity(sensitivity: number): void {
  _sensitivity = sensitivity;
}

export function isCapturing(): boolean {
  return _isCapturing;
}

// ─── Stubs kept for import compatibility ─────────────────────────────
// These were used by TingAlert for audio session handoff.
// Now that TingAlert plays no sound, these are no-ops.

export async function suspendCaptureForPlayback(): Promise<void> {}
export function resumeCaptureAfterPlayback(): void {}
export async function restoreRecordingAudioMode(): Promise<void> {}
