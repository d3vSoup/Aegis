import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { TopAppBar } from '../components/TopAppBar';
import { AegisBall } from '../components/AegisBall';
import { useAlert } from '../context/AlertContext';
import { playMechanicalClick, playPatternOnce, stopPattern } from '../utils/HapticsEngine';
import { createMockAlert, getRandomAlertType } from '../utils/AlertManager';

const AnimatedView = Animated.createAnimatedComponent(View);

// ─── Uptime Formatter ─────────────────────────────────────────────────
function formatUptime(start: Date): string {
  const totalSeconds = Math.floor((Date.now() - start.getTime()) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

export default function Home() {
  const {
    safetyMode,
    isAlertActive,
    currentAlert,
    toggleSafetyMode,
    triggerAlert,
    dismissAlert,
    eventPatternMap,
    userName,
    sessionStartTime,
    alertHistory,
  } = useAlert();

  // ─── Live Uptime Ticker ────────────────────────────────────────────
  const [uptime, setUptime] = useState(() => formatUptime(sessionStartTime));
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(formatUptime(sessionStartTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // ─── Demo Mode ────────────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTypes = useRef(['horn', 'dog', 'siren', 'name_detected'] as const);
  const demoIndex = useRef(0);

  const handleBallTap = () => {
    if (safetyMode) return; // demo only works in idle/standby mode
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      if (isDemoMode) {
        // Stop demo
        if (demoTimer.current) clearInterval(demoTimer.current);
        setIsDemoMode(false);
        stopPattern();
        dismissAlert();
      } else {
        // Start demo
        setIsDemoMode(true);
        demoIndex.current = 0;

        const fireDemoAlert = () => {
          const type = demoTypes.current[demoIndex.current % demoTypes.current.length];
          const event = createMockAlert(type, eventPatternMap, userName);
          triggerAlert(event);
          playPatternOnce(event.hapticPattern);
          demoIndex.current += 1;
        };
        fireDemoAlert();
        demoTimer.current = setInterval(fireDemoAlert, 3500);
      }
    }
  };

  // Stop demo if safety mode turns on
  useEffect(() => {
    if (safetyMode && isDemoMode) {
      if (demoTimer.current) clearInterval(demoTimer.current);
      setIsDemoMode(false);
    }
  }, [safetyMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoTimer.current) clearInterval(demoTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  // ─── Ball Mode ─────────────────────────────────────────────────────
  const ballMode = isAlertActive ? 'alert' : safetyMode ? 'armed' : 'idle';

  // ─── Toggle Animation ─────────────────────────────────────────────
  const toggleProgress = useSharedValue(0);

  const handleToggle = () => {
    const newMode = !safetyMode;
    toggleProgress.value = withSpring(newMode ? 1 : 0, { damping: 15, stiffness: 120 });
    playMechanicalClick();
    if (isAlertActive && !newMode) {
      stopPattern();
      dismissAlert();
    }
    toggleSafetyMode();
  };

  const toggleTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['rgba(53, 53, 53, 0.8)', 'rgba(255, 215, 0, 0.3)'],
    ),
    borderColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['rgba(77, 71, 50, 0.3)', 'rgba(255, 215, 0, 0.6)'],
    ),
  }));

  const toggleThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(toggleProgress.value * 36, { damping: 15, stiffness: 150 }) },
    ],
    backgroundColor: interpolateColor(
      toggleProgress.value,
      [0, 1],
      ['#555555', '#FFD700'],
    ),
  }));

  // ─── Test Alert Handler ───────────────────────────────────────────
  const handleTestAlert = () => {
    if (!safetyMode) return;
    const alertType = getRandomAlertType();
    const event = createMockAlert(alertType, eventPatternMap, userName);
    triggerAlert(event);
    playPatternOnce(event.hapticPattern);
  };

  const handleDismiss = () => {
    stopPattern();
    dismissAlert();
    if (isDemoMode) {
      if (demoTimer.current) clearInterval(demoTimer.current);
      setIsDemoMode(false);
    }
  };

  // ─── Status Text ──────────────────────────────────────────────────
  const getStatusText = () => {
    if (isAlertActive && currentAlert) return currentAlert.label.toUpperCase();
    if (safetyMode) return 'ARMED';
    if (isDemoMode) return 'DEMO';
    return 'IDLE';
  };

  const getStatusSubtext = () => {
    if (isAlertActive && currentAlert) return `${currentAlert.decibels} dB • ${currentAlert.proximity}`;
    if (safetyMode) return 'Sentinel active & listening...';
    if (isDemoMode) return 'Triple-tap to stop demo';
    return 'Safety mode disabled';
  };

  const getCoreState = () => {
    if (isDemoMode) return 'SIMULATION MODE';
    if (isAlertActive) return 'ALERT ACTIVE';
    if (safetyMode) return 'SCANNING';
    return 'CORE STATE';
  };

  return (
    <View style={styles.container}>
      <TopAppBar subtitle={safetyMode ? (isAlertActive ? 'ALERT' : 'ARMED') : isDemoMode ? 'DEMO' : 'STANDBY'} />

      <View style={styles.main}>
        {/* Glow behind ball */}
        <View style={[
          styles.glow,
          isAlertActive && styles.glowAlert,
          isDemoMode && !isAlertActive && styles.glowDemo,
        ]} />

        {/* The Aegis Ball — tappable for demo mode */}
        <Pressable onPress={handleBallTap}>
          <AegisBall mode={ballMode} />
        </Pressable>

        {/* Demo Badge */}
        {isDemoMode && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO · TRIPLE-TAP TO STOP</Text>
          </View>
        )}

        {/* Overlaid Information */}
        <View pointerEvents="box-none" style={styles.overlay}>
          {/* Top Right Status */}
          <View style={styles.topRight}>
            <Text style={[
              styles.italicHeadline,
              isAlertActive && styles.alertText,
              isDemoMode && styles.demoText,
            ]}>
              {isAlertActive ? 'Threat detected...' : safetyMode ? 'Sentinel active...' : isDemoMode ? 'Running simulation...' : 'Awaiting input sequence...'}
            </Text>
          </View>

          {/* Bottom Left Data */}
          <View style={styles.bottomLeft}>
            <Text style={styles.technicalText}>MODE: {safetyMode ? 'ACTIVE' : isDemoMode ? 'SIMULATE' : 'PASSIVE'}</Text>
            <Text style={styles.technicalText}>SENS: {isAlertActive ? 'HIGH' : 'NOMINAL'}</Text>
            <Text style={styles.technicalText}>UPTIME: {uptime}</Text>
            <Text style={styles.technicalText}>EVENTS: {String(alertHistory.length).padStart(3, '0')}</Text>
          </View>

          {/* Center Info */}
          <View style={styles.centerInfo}>
            <Text style={[styles.coreState, isAlertActive && styles.alertText, isDemoMode && styles.demoText]}>
              {getCoreState()}
            </Text>
            <Text style={[
              styles.centerStatus,
              isAlertActive && styles.alertStatusText,
              isDemoMode && !isAlertActive && styles.demoStatusText,
            ]}>
              {getStatusText()}
            </Text>
          </View>

          {/* Armed Tag */}
          {safetyMode && !isAlertActive && (
            <View style={styles.syncReadyContainer}>
              <Text style={styles.syncReady}>ARMED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Alert Dismiss Button */}
      {isAlertActive && (
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
          <Text style={styles.dismissText}>DISMISS ALERT</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {!isDemoMode && safetyMode && !isAlertActive && (
          <TouchableOpacity style={styles.testButton} onPress={handleTestAlert}>
            <Text style={styles.testButtonIcon}>⚡</Text>
            <Text style={styles.testButtonText}>TEST ALERT</Text>
          </TouchableOpacity>
        )}

        {!isDemoMode && !safetyMode && (
          <View style={styles.demoHint}>
            <Text style={styles.demoHintText}>TRIPLE-TAP THE ORB TO RUN SIMULATION</Text>
          </View>
        )}

        <View style={styles.toggleContainer}>
          <View style={styles.toggleLabelRow}>
            <Text style={styles.toggleLabel}>SAFETY MODE</Text>
            <Text style={[styles.toggleStatus, safetyMode && styles.toggleStatusActive]}>
              {safetyMode ? 'ON' : 'OFF'}
            </Text>
          </View>

          <Pressable onPress={handleToggle}>
            <AnimatedView style={[styles.toggleTrack, toggleTrackStyle]}>
              <AnimatedView style={[styles.toggleThumb, toggleThumbStyle]} />
            </AnimatedView>
          </Pressable>

          <Text style={styles.toggleHint}>
            {safetyMode ? 'Your sentinel is active. Haptic alerts enabled.' : 'Enable to start environmental monitoring.'}
          </Text>
        </View>
      </View>

      {/* Status Toast */}
      <View style={[
        styles.toastContainer,
        isAlertActive && styles.toastAlert,
        isDemoMode && !isAlertActive && styles.toastDemo,
      ]}>
        <View style={[styles.toastDot, isAlertActive && styles.toastDotAlert, isDemoMode && !isAlertActive && styles.toastDotDemo]} />
        <Text style={styles.toastText}>
          {isAlertActive ? 'ALERT IN PROGRESS' : safetyMode ? 'SYSTEM SENTINEL ACTIVE' : isDemoMode ? 'SIMULATION ACTIVE' : 'SENTINEL OFFLINE'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 20,
  },
  glowAlert: {
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    shadowColor: '#FF4444',
    shadowOpacity: 0.8,
  },
  glowDemo: {
    backgroundColor: 'rgba(121, 245, 255, 0.05)',
    shadowColor: '#79F5FF',
    shadowOpacity: 0.5,
  },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 32, zIndex: 10 },
  topRight: { position: 'absolute', top: 20, right: 32 },
  italicHeadline: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  alertText: { color: '#FF6B6B' },
  demoText: { color: Colors.tertiaryFixed },
  bottomLeft: { position: 'absolute', bottom: 160, left: 32 },
  technicalText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.surfaceContainerHighest,
    lineHeight: 18,
    letterSpacing: 1.5,
  },
  centerInfo: {
    position: 'absolute',
    top: '44%',
    left: '50%',
    transform: [{ translateX: -110 }, { translateY: -25 }],
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
  },
  coreState: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.outlineVariant,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  centerStatus: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 32,
    color: '#FFD700',
    letterSpacing: 1,
    lineHeight: 42,
  },
  alertStatusText: { fontSize: 22, color: '#FF6B6B' },
  demoStatusText: { color: Colors.tertiaryFixed },
  syncReadyContainer: {
    position: 'absolute',
    top: '28%',
    right: '20%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  syncReady: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: Colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  demoBadge: {
    position: 'absolute',
    top: -160,
    backgroundColor: 'rgba(121, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(121, 245, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  demoBadgeText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: Colors.tertiaryFixed,
    letterSpacing: 2,
  },

  // ─── Dismiss ──────────────────────────────────────────────────────
  dismissButton: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    zIndex: 20,
  },
  dismissText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    color: '#FF6B6B',
    letterSpacing: 2,
  },

  // ─── Bottom Controls ──────────────────────────────────────────────
  bottomControls: { paddingHorizontal: 32, paddingBottom: 100, gap: 16 },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 12,
    marginBottom: 4,
  },
  testButtonIcon: { fontSize: 14 },
  testButtonText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    color: Colors.primaryContainer,
    letterSpacing: 2,
  },
  demoHint: { alignItems: 'center', paddingVertical: 6 },
  demoHintText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    color: 'rgba(121, 245, 255, 0.4)',
    letterSpacing: 2,
  },
  toggleContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 20,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryContainer,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: Colors.onSurface,
    letterSpacing: 2,
  },
  toggleStatus: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    color: Colors.surfaceContainerHighest,
    letterSpacing: 2,
  },
  toggleStatusActive: { color: Colors.primaryContainer },
  toggleTrack: {
    width: 72,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
    letterSpacing: 0.3,
  },

  // ─── Toast ────────────────────────────────────────────────────────
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(57, 57, 57, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    gap: 12,
    zIndex: 50,
  },
  toastAlert: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  toastDemo: {
    backgroundColor: 'rgba(121, 245, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(121, 245, 255, 0.25)',
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  toastDotAlert: { backgroundColor: '#FF4444', shadowColor: '#FF4444' },
  toastDotDemo: { backgroundColor: Colors.tertiaryFixed, shadowColor: Colors.tertiaryFixed },
  toastText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
