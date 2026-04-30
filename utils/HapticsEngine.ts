import * as Haptics from 'expo-haptics';
import type { HapticPattern } from '../context/AlertContext';

// ─── Pattern Step Definition ─────────────────────────────────────────
interface HapticStep {
  style: Haptics.ImpactFeedbackStyle;
  delay: number; // ms before this step fires
}

// ─── Pattern Definitions ─────────────────────────────────────────────
// All patterns are tuned to MAXIMUM intensity. Rigid is the hardest
// impact style available. The goal is unmistakable physical communication.
const PATTERNS: Record<HapticPattern, HapticStep[]> = {
  staccato: [
    // MAX INTENSITY: Rapid-fire triple salvo — double-burst with a hard rest
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 0   },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 250 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60  },
  ],

  siren: [
    // MAX INTENSITY: Full crescendo-decrescendo wave, all Heavy/Rigid
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 0   },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 180 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 90  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 90  },
  ],

  heartbeat: [
    // MAX INTENSITY: Bone-deep double-thump with a hard pause — unmistakable
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 0   },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 110 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 550 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 110 },
  ],
};

// ─── State ───────────────────────────────────────────────────────────
let activeTimers: ReturnType<typeof setTimeout>[] = [];
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let isPlaying = false;

// ─── Global Intensity Multiplier ─────────────────────────────────────
// 0-100 scale that the user controls in Settings.
// Maps to: 0-24→Light, 25-49→Medium, 50-74→Heavy, 75-100→Rigid
let globalIntensity: number = 75; // default: high

export function setGlobalIntensityMultiplier(value: number): void {
  globalIntensity = Math.max(0, Math.min(100, value));
}

export function getGlobalIntensity(): number {
  return globalIntensity;
}

/**
 * Maps an intensity value (0-100) to an ImpactFeedbackStyle cap.
 * Steps above this cap are clamped down to it.
 */
function intensityToMaxStyle(intensity: number): Haptics.ImpactFeedbackStyle {
  if (intensity < 25) return Haptics.ImpactFeedbackStyle.Light;
  if (intensity < 50) return Haptics.ImpactFeedbackStyle.Medium;
  if (intensity < 75) return Haptics.ImpactFeedbackStyle.Heavy;
  return Haptics.ImpactFeedbackStyle.Rigid;
}

/**
 * Clamp a step's style to the current global intensity cap.
 */
function clampStyle(style: Haptics.ImpactFeedbackStyle): Haptics.ImpactFeedbackStyle {
  const cap = intensityToMaxStyle(globalIntensity);
  const order: Haptics.ImpactFeedbackStyle[] = [
    Haptics.ImpactFeedbackStyle.Light,
    Haptics.ImpactFeedbackStyle.Medium,
    Haptics.ImpactFeedbackStyle.Heavy,
    Haptics.ImpactFeedbackStyle.Rigid,
  ];
  const styleIdx = order.indexOf(style);
  const capIdx = order.indexOf(cap);
  return order[Math.min(styleIdx, capIdx)];
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Play a single haptic impact.
 */
export async function playOnce(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Heavy,
): Promise<void> {
  try {
    await Haptics.impactAsync(clampStyle(style));
  } catch {
    // Haptics not available (e.g., simulator)
  }
}

/**
 * CRITICAL SLAM — The "Ting" moment haptic.
 * Fires an immediate escalating barrage of maximum-weight impacts
 * to announce the notification popup. This bypasses the pattern
 * queue and fires instantly.
 */
export async function playCriticalSlam(): Promise<void> {
  const sequence: Array<{ style: Haptics.ImpactFeedbackStyle; delay: number }> = [
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 0   },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 55  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 55  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 130 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 55  },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 55  },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 200 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 55  },
  ];

  let accumulated = 0;
  for (const step of sequence) {
    accumulated += step.delay;
    setTimeout(() => {
      Haptics.impactAsync(step.style).catch(() => {});
    }, accumulated);
  }
}

/**
 * Play a firm, mechanical click — used for the Safety Mode toggle.
 */
export async function playMechanicalClick(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    await new Promise((r) => setTimeout(r, 50));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Haptics not available
  }
}

/**
 * Play a selection tick — used for picker changes.
 */
export async function playSelectionTick(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics not available
  }
}

/**
 * Play a notification haptic.
 */
export async function playNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Warning,
): Promise<void> {
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Haptics not available
  }
}

/**
 * The strongest possible initial punch — used when an alert first fires.
 * Combines the system Error notification motor pattern with 4 rapid Heavy
 * impacts. This is the maximum intensity achievable without a native module.
 *
 * Call this ONCE at alert trigger, then follow with playPatternLoop().
 */
export async function playAlertBurst(): Promise<void> {
  try {
    // Error notification uses iPhone's dedicated "urgent" motor pattern
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    // Immediately layer 4 rapid Heavy hits on top
    const delays = [30, 70, 110, 160];
    for (const delay of delays) {
      await new Promise((r) => setTimeout(r, delay));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    // One final Rigid for a sharp cutoff
    await new Promise((r) => setTimeout(r, 60));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  } catch {
    // Haptics not available (web, simulator)
  }
}

/**
 * Play a haptic pattern once (non-looping).
 */
export function playPatternOnce(pattern: HapticPattern): void {
  const steps = PATTERNS[pattern];
  if (!steps) return;

  let accumulatedDelay = 0;
  const timers: ReturnType<typeof setTimeout>[] = [];

  steps.forEach((step) => {
    accumulatedDelay += step.delay;
    const timer = setTimeout(() => {
      Haptics.impactAsync(clampStyle(step.style)).catch(() => {});
    }, accumulatedDelay);
    timers.push(timer);
  });

  activeTimers.push(...timers);
}

/**
 * Play a haptic pattern in a loop until stopped.
 * Loops with a gap between iterations.
 */
export function playPatternLoop(pattern: HapticPattern, gapMs: number = 800): void {
  stopPattern(); // Stop any existing pattern

  isPlaying = true;
  const steps = PATTERNS[pattern];
  if (!steps) return;

  // Calculate total duration of one cycle
  const totalDuration = steps.reduce((sum, step) => sum + step.delay, 0);

  function runCycle() {
    if (!isPlaying) return;

    let accumulatedDelay = 0;
    steps.forEach((step) => {
      accumulatedDelay += step.delay;
      const timer = setTimeout(() => {
        if (!isPlaying) return;
        Haptics.impactAsync(clampStyle(step.style)).catch(() => {});
      }, accumulatedDelay);
      activeTimers.push(timer);
    });

    // Schedule next cycle
    loopTimer = setTimeout(() => {
      if (isPlaying) runCycle();
    }, totalDuration + gapMs);
  }

  runCycle();
}

/**
 * Stop any currently playing pattern.
 */
export function stopPattern(): void {
  isPlaying = false;
  activeTimers.forEach(clearTimeout);
  activeTimers = [];
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

/**
 * Get the display name for a pattern.
 */
export function getPatternDisplayName(pattern: HapticPattern): string {
  const names: Record<HapticPattern, string> = {
    staccato: 'Staccato',
    siren: 'Siren',
    heartbeat: 'Heartbeat',
  };
  return names[pattern] || pattern;
}

/**
 * Get the icon for a pattern.
 */
export function getPatternIcon(pattern: HapticPattern): string {
  const icons: Record<HapticPattern, string> = {
    staccato: '💧',
    siren: '🌊',
    heartbeat: '💓',
  };
  return icons[pattern] || '•';
}
