import * as Haptics from 'expo-haptics';
import type { HapticPattern } from '../context/AlertContext';

// ─── Pattern Step Definition ─────────────────────────────────────────
interface HapticStep {
  style: Haptics.ImpactFeedbackStyle;
  delay: number; // ms before this step fires
}

// ─── Pattern Definitions ─────────────────────────────────────────────
const PATTERNS: Record<HapticPattern, HapticStep[]> = {
  staccato: [
    // Short, sharp bursts — rapid-fire Rigid hits (tightest gap = strongest feel)
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 0 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 40 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 40 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 200 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 40 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 40 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 40 },
  ],

  siren: [
    // All Heavy — dense wave, no light hits, faster tempo
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 0 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 160 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 60 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 60 },
  ],

  heartbeat: [
    // All Heavy — deep double-thump feels like a real heartbeat punch
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 0 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 100 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 550 },
    { style: Haptics.ImpactFeedbackStyle.Heavy, delay: 100 },
  ],
};

// ─── State ───────────────────────────────────────────────────────────
let activeTimers: ReturnType<typeof setTimeout>[] = [];
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let isPlaying = false;

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Play a single haptic impact.
 */
export async function playOnce(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium,
): Promise<void> {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not available (e.g., simulator)
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
      Haptics.impactAsync(step.style).catch(() => {});
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
        Haptics.impactAsync(step.style).catch(() => {});
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
