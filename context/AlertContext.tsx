import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  saveHistory,
  loadHistory,
  clearHistory as storageClearHistory,
  saveUserName,
  loadUserName,
  saveSensitivity,
  loadSensitivity,
} from '../services/StorageService';
import {
  startInference,
  stopInference,
} from '../services/AudioInference';
import { createMockAlert } from '../utils/AlertManager';
import {
  setupNotifications,
  fireAlertNotification,
  dismissAlertNotifications,
} from '../utils/NotificationService';
import { playAlertBurst } from '../utils/HapticsEngine';
import {
  startBackgroundService,
  stopBackgroundService,
} from '../services/BackgroundService';
import {
  loadSafeZones,
  startGeofencing,
  stopGeofencing,
  addSafeZone as geoAddSafeZone,
  removeSafeZone as geoRemoveSafeZone,
  requestLocationPermission,
} from '../services/GeofenceService';
import type { SafeZone } from '../services/GeofenceService';
import {
  startActivityMonitoring,
  stopActivityMonitoring,
} from '../services/ActivityService';

// ─── Types ───────────────────────────────────────────────────────────
export type HapticPattern = 'staccato' | 'siren' | 'heartbeat';

export type AlertEventType = 'horn' | 'dog' | 'siren' | 'name_detected';

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  label: string;
  timestamp: Date;
  decibels: number;
  proximity?: string;
  hapticPattern: HapticPattern;
}

export interface EventPatternMap {
  horn: HapticPattern;
  dog: HapticPattern;
  name: HapticPattern;
  siren: HapticPattern;
}

interface AlertState {
  safetyMode: boolean;
  isAlertActive: boolean;
  currentAlert: AlertEvent | null;
  userName: string;
  defaultHapticPattern: HapticPattern;
  sensitivity: number;
  eventPatternMap: EventPatternMap;
  alertHistory: AlertEvent[];
  sessionStartTime: Date;
  isHydrated: boolean;
  safeZones: SafeZone[];
  isInSafeZone: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────
type AlertAction =
  | { type: 'TOGGLE_SAFETY_MODE' }
  | { type: 'TRIGGER_ALERT'; payload: AlertEvent }
  | { type: 'DISMISS_ALERT' }
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_DEFAULT_PATTERN'; payload: HapticPattern }
  | { type: 'SET_EVENT_PATTERN'; payload: { event: keyof EventPatternMap; pattern: HapticPattern } }
  | { type: 'SET_SENSITIVITY'; payload: number }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'HYDRATE'; payload: Partial<AlertState> }
  | { type: 'SET_SAFE_ZONES'; payload: SafeZone[] }
  | { type: 'SET_IN_SAFE_ZONE'; payload: boolean };

// ─── Initial State ───────────────────────────────────────────────────
const initialState: AlertState = {
  safetyMode: false,
  isAlertActive: false,
  currentAlert: null,
  userName: '',
  defaultHapticPattern: 'heartbeat',
  sensitivity: 68,
  eventPatternMap: {
    horn: 'staccato',
    dog: 'heartbeat',
    name: 'siren',
    siren: 'siren',
  },
  alertHistory: [],
  sessionStartTime: new Date(),
  isHydrated: false,
  safeZones: [],
  isInSafeZone: false,
};

// ─── Reducer ─────────────────────────────────────────────────────────
function alertReducer(state: AlertState, action: AlertAction): AlertState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isHydrated: true };

    case 'TOGGLE_SAFETY_MODE':
      return {
        ...state,
        safetyMode: !state.safetyMode,
        isAlertActive: !state.safetyMode ? state.isAlertActive : false,
        currentAlert: !state.safetyMode ? state.currentAlert : null,
      };

    case 'TRIGGER_ALERT':
      return {
        ...state,
        isAlertActive: true,
        currentAlert: action.payload,
        alertHistory: [action.payload, ...state.alertHistory].slice(0, 100), // keep last 100
      };

    case 'DISMISS_ALERT':
      return { ...state, isAlertActive: false, currentAlert: null };

    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };

    case 'SET_DEFAULT_PATTERN':
      return { ...state, defaultHapticPattern: action.payload };

    case 'SET_EVENT_PATTERN':
      return {
        ...state,
        eventPatternMap: {
          ...state.eventPatternMap,
          [action.payload.event]: action.payload.pattern,
        },
      };

    case 'SET_SENSITIVITY':
      return { ...state, sensitivity: action.payload };

    case 'CLEAR_HISTORY':
      return { ...state, alertHistory: [], isAlertActive: false, currentAlert: null };

    case 'SET_SAFE_ZONES':
      return { ...state, safeZones: action.payload };

    case 'SET_IN_SAFE_ZONE':
      return { ...state, isInSafeZone: action.payload };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────
interface AlertContextType extends AlertState {
  toggleSafetyMode: () => void;
  triggerAlert: (event: AlertEvent) => void;
  dismissAlert: () => void;
  setUserName: (name: string) => void;
  setDefaultPattern: (pattern: HapticPattern) => void;
  setEventPattern: (event: keyof EventPatternMap, pattern: HapticPattern) => void;
  setSensitivity: (value: number) => void;
  clearHistory: () => void;
  addSafeZone: (name: string) => Promise<void>;
  removeSafeZone: (id: string) => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(alertReducer, initialState);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Request notification permissions + load safe zones on mount ───
  useEffect(() => {
    setupNotifications();
    requestLocationPermission();
    loadSafeZones().then((zones) => {
      dispatch({ type: 'SET_SAFE_ZONES', payload: zones });
    });
  }, []);

  // ── Hydrate from AsyncStorage on mount ────────────────────────────
  useEffect(() => {
    async function hydrate() {
      const [history, userName, sensitivity] = await Promise.all([
        loadHistory(),
        loadUserName(),
        loadSensitivity(),
      ]);
      dispatch({
        type: 'HYDRATE',
        payload: { alertHistory: history, userName, sensitivity },
      });
    }
    hydrate();
  }, []);

  // ── Persist history whenever it changes (after hydration) ─────────
  useEffect(() => {
    if (!state.isHydrated) return;
    saveHistory(state.alertHistory);
  }, [state.alertHistory, state.isHydrated]);

  // ── Wire AudioInference + Background + Geofence + Activity to safetyMode ─
  useEffect(() => {
    if (state.safetyMode) {
      // Start inference loop
      startInference((result) => {
        const event = createMockAlert(result.type, state.eventPatternMap, state.userName);
        const enrichedEvent = { ...event, decibels: result.decibels };
        dispatch({ type: 'TRIGGER_ALERT', payload: enrichedEvent });
      }, state.sensitivity);

      // Start persistent background sentinel notification
      startBackgroundService();

      // Start geofencing safe zones
      if (state.safeZones.length > 0) {
        startGeofencing(state.safeZones, (insideZone, _zoneId) => {
          dispatch({ type: 'SET_IN_SAFE_ZONE', payload: insideZone });
        });
      }

      // Start adaptive activity monitoring
      startActivityMonitoring((_activity, _multipliers) => {
        // Multipliers are applied live inside AudioInference.ts via getCurrentMultipliers()
      });
    } else {
      stopInference();
      stopBackgroundService();
      stopGeofencing();
      stopActivityMonitoring();
      dispatch({ type: 'SET_IN_SAFE_ZONE', payload: false });
    }
    return () => {
      stopInference();
      stopBackgroundService();
      stopGeofencing();
      stopActivityMonitoring();
    };
  }, [state.safetyMode]);

  // ─── Callbacks ───────────────────────────────────────────────────
  const toggleSafetyMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_SAFETY_MODE' });
  }, []);

  const triggerAlert = useCallback((event: AlertEvent) => {
    dispatch({ type: 'TRIGGER_ALERT', payload: event });
    // Fire system notification (appears over any running app)
    fireAlertNotification(event);
    // Fire the strongest haptic burst first
    playAlertBurst();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      dispatch({ type: 'DISMISS_ALERT' });
      dismissAlertNotifications();
    }, 10000);
  }, []);

  const dismissAlert = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissAlertNotifications();
    dispatch({ type: 'DISMISS_ALERT' });
  }, []);

  const setUserName = useCallback((name: string) => {
    dispatch({ type: 'SET_USER_NAME', payload: name });
    saveUserName(name);
  }, []);

  const setDefaultPattern = useCallback((pattern: HapticPattern) => {
    dispatch({ type: 'SET_DEFAULT_PATTERN', payload: pattern });
  }, []);

  const setEventPattern = useCallback((event: keyof EventPatternMap, pattern: HapticPattern) => {
    dispatch({ type: 'SET_EVENT_PATTERN', payload: { event, pattern } });
  }, []);

  const setSensitivity = useCallback((value: number) => {
    dispatch({ type: 'SET_SENSITIVITY', payload: value });
    saveSensitivity(value);
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
    storageClearHistory();
  }, []);

  const addSafeZone = useCallback(async (name: string) => {
    const zone = await geoAddSafeZone(name);
    if (zone) {
      const updated = [...state.safeZones, zone];
      dispatch({ type: 'SET_SAFE_ZONES', payload: updated });
    }
  }, [state.safeZones]);

  const removeSafeZone = useCallback(async (id: string) => {
    const updated = await geoRemoveSafeZone(id);
    dispatch({ type: 'SET_SAFE_ZONES', payload: updated });
  }, []);

  const contextValue: AlertContextType = {
    ...state,
    toggleSafetyMode,
    triggerAlert,
    dismissAlert,
    setUserName,
    setDefaultPattern,
    setEventPattern,
    setSensitivity,
    clearHistory,
    addSafeZone,
    removeSafeZone,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
