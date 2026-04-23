// ─── WearableService.ts ───────────────────────────────────────────────
// Bluetooth LE communication layer for Aegis wearable integration.
//
// Architecture:
//   Phone (mic + TFLite inference) → BLE write → Watch (haptics)
//
// Aegis Haptic Protocol v1 — a 3-byte BLE characteristic write:
//   Byte 0: eventType  (0=horn, 1=dog, 2=siren, 3=name_detected)
//   Byte 1: patternId  (0=staccato, 1=siren, 2=heartbeat)
//   Byte 2: intensity  (0–255, maps to 0–100%)
//
// Target devices: Apple Watch (WatchOS companion), Galaxy Watch (WearOS),
//                 any BLE peripheral advertising the Aegis service UUID.
//
// IMPORTANT: react-native-ble-plx (required for real BLE) is a native module.
//            This service currently stubs the API surface so that:
//            1. The rest of the app can call WearableService now
//            2. When the dev build is ready, only the STUB SECTION below
//               needs to be replaced with real BLE calls.
// ─────────────────────────────────────────────────────────────────────

import type { HapticPattern, AlertEventType } from '../context/AlertContext';

// ─── Aegis BLE Protocol Constants ────────────────────────────────────

export const AEGIS_SERVICE_UUID      = '12345678-1234-1234-1234-123456789ABC';
export const AEGIS_HAPTIC_CHAR_UUID  = '12345678-1234-1234-1234-123456789ABD';
export const AEGIS_STATUS_CHAR_UUID  = '12345678-1234-1234-1234-123456789ABE';

const EVENT_TYPE_BYTE: Record<AlertEventType, number> = {
  horn:          0,
  dog:           1,
  siren:         2,
  name_detected: 3,
};

const PATTERN_BYTE: Record<HapticPattern, number> = {
  staccato:  0,
  siren:     1,
  heartbeat: 2,
};

// ─── Types ───────────────────────────────────────────────────────────

export interface WearableDevice {
  id: string;
  name: string;
  rssi: number; // signal strength dBm
  connected: boolean;
}

export type WearableStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'unavailable';

type StatusCallback = (status: WearableStatus, device?: WearableDevice) => void;

// ─── State ───────────────────────────────────────────────────────────

let _status: WearableStatus = 'disconnected';
let _connectedDevice: WearableDevice | null = null;
let _statusCallback: StatusCallback | null = null;

// ─── ─── ─── STUB SECTION ─── ─── ────────────────────────────────────
// REPLACE with real react-native-ble-plx calls when dev build is ready:
//
//   import { BleManager } from 'react-native-ble-plx';
//   const bleManager = new BleManager();
//
//   export async function startScan() {
//     bleManager.startDeviceScan(
//       [AEGIS_SERVICE_UUID],
//       null,
//       (error, device) => { ... connect + pair ... }
//     );
//   }
//
//   export async function sendHapticCommand(...) {
//     const base64 = btoa(String.fromCharCode(...packet));
//     await device.writeCharacteristicWithResponseForService(
//       AEGIS_SERVICE_UUID, AEGIS_HAPTIC_CHAR_UUID, base64
//     );
//   }
// ─── ─── ─── END STUB ─── ─── ────────────────────────────────────────

function setStatus(s: WearableStatus, device?: WearableDevice): void {
  _status = s;
  _connectedDevice = device ?? null;
  _statusCallback?.(s, device);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Register a callback to receive connection status updates.
 */
export function onStatusChange(cb: StatusCallback): void {
  _statusCallback = cb;
}

/**
 * Start scanning for Aegis-compatible BLE peripherals.
 * STUB: simulates scan then reports unavailable (no BLE module loaded).
 */
export async function startScan(): Promise<void> {
  setStatus('scanning');
  // STUB — replace with BleManager.startDeviceScan()
  setTimeout(() => {
    setStatus('unavailable');
    console.info('[Aegis Wearable] BLE scan stub — install react-native-ble-plx + dev build to enable.');
  }, 2000);
}

/**
 * Stop any active scan.
 */
export function stopScan(): void {
  if (_status === 'scanning') setStatus('disconnected');
}

/**
 * Disconnect from the currently paired device.
 */
export async function disconnect(): Promise<void> {
  setStatus('disconnected');
}

/**
 * Send a haptic command to the paired wearable.
 * Builds the 3-byte Aegis Haptic Protocol packet and writes it.
 *
 * @param eventType  The alert type that fired
 * @param pattern    The haptic pattern to play on the watch
 * @param intensity  0–100 intensity percentage
 */
export async function sendHapticCommand(
  eventType: AlertEventType,
  pattern: HapticPattern,
  intensity = 100,
): Promise<void> {
  if (_status !== 'connected' || !_connectedDevice) return;

  const packet = new Uint8Array([
    EVENT_TYPE_BYTE[eventType],
    PATTERN_BYTE[pattern],
    Math.round((intensity / 100) * 255),
  ]);

  // STUB — replace with BLE characteristic write:
  console.info('[Aegis Wearable] Would send packet:', Array.from(packet));
}

/**
 * Get the current wearable connection status.
 */
export function getStatus(): WearableStatus {
  return _status;
}

/**
 * Get the currently connected device, if any.
 */
export function getConnectedDevice(): WearableDevice | null {
  return _connectedDevice;
}
