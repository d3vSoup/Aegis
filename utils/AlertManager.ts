import type { AlertEvent, AlertEventType, HapticPattern, EventPatternMap } from '../context/AlertContext';

// ─── Mock Alert Generators ──────────────────────────────────────────
let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `alert_${Date.now()}_${idCounter}`;
}

const EVENT_LABELS: Record<AlertEventType, string> = {
  horn: 'Car Horn',
  dog: 'Dog Bark',
  siren: 'Emergency Siren',
  name_detected: 'Name Detected',
};

const EVENT_DB_RANGES: Record<AlertEventType, [number, number]> = {
  horn: [75, 95],
  dog: [60, 80],
  siren: [85, 105],
  name_detected: [50, 70],
};

const EVENT_PROXIMITY: Record<AlertEventType, string[]> = {
  horn: ['50m', '100m', '250m', '500m'],
  dog: ['10m', '25m', '50m'],
  siren: ['200m', '500m', '1km', '2km'],
  name_detected: ['3m', '5m', '10m'],
};

/**
 * Create a mock alert event for testing.
 * In production, this would be triggered by the native audio bridge.
 */
export function createMockAlert(
  type: AlertEventType,
  eventPatternMap: EventPatternMap,
  userName?: string,
): AlertEvent {
  const [minDb, maxDb] = EVENT_DB_RANGES[type];
  const decibels = Math.round(minDb + Math.random() * (maxDb - minDb));
  const proximities = EVENT_PROXIMITY[type];
  const proximity = proximities[Math.floor(Math.random() * proximities.length)];

  // Map the event type to the correct key in eventPatternMap
  const patternKey: keyof EventPatternMap =
    type === 'name_detected' ? 'name' : type;

  const label =
    type === 'name_detected' && userName
      ? `"${userName}" Detected`
      : EVENT_LABELS[type];

  return {
    id: generateId(),
    type,
    label,
    timestamp: new Date(),
    decibels,
    proximity,
    hapticPattern: eventPatternMap[patternKey],
  };
}

/**
 * Get a random alert type for the "Test Alert" button.
 */
export function getRandomAlertType(): AlertEventType {
  const types: AlertEventType[] = ['horn', 'dog', 'siren', 'name_detected'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Format a timestamp for display in history.
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Get the severity level for an alert type.
 */
export function getAlertSeverity(type: AlertEventType): 'critical' | 'warning' | 'info' {
  switch (type) {
    case 'siren':
      return 'critical';
    case 'horn':
    case 'name_detected':
      return 'warning';
    case 'dog':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Get the category label for an alert type.
 */
export function getAlertCategory(type: AlertEventType): string {
  switch (type) {
    case 'horn':
      return 'URBAN';
    case 'dog':
      return 'DOMESTIC';
    case 'siren':
      return 'CRITICAL';
    case 'name_detected':
      return 'PERSONAL';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get a description for an alert event.
 */
export function getAlertDescription(event: AlertEvent): string {
  switch (event.type) {
    case 'horn':
      return `High-amplitude transient detected. Proximity: ${event.proximity}. Vector matches vehicular horn signature.`;
    case 'dog':
      return `Repeated acoustic signature. Identified as "Domestic Canine". Proximity: ${event.proximity}. No urgent threat vector determined.`;
    case 'siren':
      return `High-frequency oscillation detected. Proximity: ${event.proximity}. Vector matches emergency vehicle transit pattern.`;
    case 'name_detected':
      return `Vocal pattern match for registered user name. Proximity: ${event.proximity}. Source direction analysis in progress.`;
    default:
      return `Unknown acoustic event detected at ${event.decibels} dB.`;
  }
}
