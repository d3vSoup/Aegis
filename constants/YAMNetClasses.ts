// ─── YAMNetClasses.ts ────────────────────────────────────────────────
// Maps YAMNet's 521 output class indices to Aegis AlertEventTypes.
// Source: AudioSet ontology (yamnet_class_map.csv from TensorFlow Hub)
//
// TO ACTIVATE: see AudioInference.ts TODO comments.
// ─────────────────────────────────────────────────────────────────────

import type { AlertEventType } from '../context/AlertContext';

const YAMNET_CLASS_RANGES: Record<AlertEventType, [number, number][]> = {
  siren:         [[396, 400]], // Siren, Civil defense, Ambulance, Police, Fire engine
  horn:          [[300, 303], [385, 385]], // Car horn, Foghorn, Bicycle bell, Air horn
  dog:           [[74, 78]],  // Dog, Bark, Yip, Howl, Bow-wow
  name_detected: [[0, 4]],    // Speech, Male/Female/Child speech, Conversation
};

// ─── Fast Lookup Map ──────────────────────────────────────────────────

const _indexToType = new Map<number, AlertEventType>();

for (const [eventType, ranges] of Object.entries(YAMNET_CLASS_RANGES)) {
  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i++) {
      _indexToType.set(i, eventType as AlertEventType);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Given 521 YAMNet output scores, returns the top matching Aegis event.
 * Returns null if no class clears minConfidence.
 */
export function classifyYAMNetOutput(
  scores: Float32Array | number[],
  minConfidence = 0.3,
): { type: AlertEventType; confidence: number; classIndex: number } | null {
  let bestType: AlertEventType | null = null;
  let bestScore = minConfidence;
  let bestIndex = -1;

  for (const [index, type] of _indexToType.entries()) {
    const score = scores[index];
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
      bestIndex = index;
    }
  }

  if (!bestType) return null;
  return { type: bestType, confidence: bestScore, classIndex: bestIndex };
}

export function getAllMonitoredIndices(): Map<number, AlertEventType> {
  return _indexToType;
}
