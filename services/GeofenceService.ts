// ─── GeofenceService.ts ──────────────────────────────────────────────
// Manages Safe Zones — GPS regions where Aegis monitoring is paused
// or sensitivity is reduced to prevent alert fatigue in known-safe areas.
//
// Uses expo-location geofencing (works in Expo Go on iOS + Android).
// ─────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string; // ISO string
}

export type GeofenceCallback = (insideZone: boolean, zoneId: string) => void;

// ─── Constants ───────────────────────────────────────────────────────

const GEOFENCE_TASK = 'AEGIS_GEOFENCE_TASK';
const SAFE_ZONES_KEY = 'aegis_safe_zones';
const DEFAULT_RADIUS_METERS = 200;

// ─── Task Registration ────────────────────────────────────────────────
// Must be defined at module level (outside of components) per expo-task-manager rules.

let _geofenceCallback: GeofenceCallback | null = null;

TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }: any) => {
  if (error) {
    console.warn('[Aegis Geofence]', error);
    return;
  }
  if (data && _geofenceCallback) {
    const { eventType, region } = data;
    const isEntering = eventType === Location.GeofencingEventType.Enter;
    _geofenceCallback(isEntering, region.identifier);
  }
});

// ─── Permissions ─────────────────────────────────────────────────────

export async function requestLocationPermission(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;

  // Background location is needed for geofencing while app is ARMED
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

// ─── Storage ─────────────────────────────────────────────────────────

export async function loadSafeZones(): Promise<SafeZone[]> {
  try {
    const raw = await AsyncStorage.getItem(SAFE_ZONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveSafeZones(zones: SafeZone[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAFE_ZONES_KEY, JSON.stringify(zones));
  } catch {
    console.warn('[Aegis] Failed to save safe zones');
  }
}

export async function addSafeZone(name: string): Promise<SafeZone | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const zone: SafeZone = {
      id: `zone_${Date.now()}`,
      name: name.trim() || 'Safe Zone',
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      radiusMeters: DEFAULT_RADIUS_METERS,
      createdAt: new Date().toISOString(),
    };

    const existing = await loadSafeZones();
    await saveSafeZones([...existing, zone]);
    return zone;
  } catch (err) {
    console.warn('[Aegis] Failed to add safe zone:', err);
    return null;
  }
}

export async function removeSafeZone(id: string): Promise<SafeZone[]> {
  const zones = await loadSafeZones();
  const updated = zones.filter((z) => z.id !== id);
  await saveSafeZones(updated);
  return updated;
}

// ─── Geofencing Lifecycle ─────────────────────────────────────────────

export async function startGeofencing(
  zones: SafeZone[],
  callback: GeofenceCallback,
): Promise<void> {
  if (zones.length === 0) return;

  _geofenceCallback = callback;

  const regions: Location.LocationRegion[] = zones.map((z) => ({
    identifier: z.id,
    latitude: z.latitude,
    longitude: z.longitude,
    radius: z.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  try {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  } catch (err) {
    console.warn('[Aegis Geofence] Failed to start:', err);
  }
}

export async function stopGeofencing(): Promise<void> {
  _geofenceCallback = null;
  try {
    const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  } catch {
    // ignore
  }
}

// ─── Current Location ─────────────────────────────────────────────────

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch {
    return null;
  }
}
