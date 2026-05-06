import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, interpolateColor, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { AegisBall } from '../components/AegisBall';
import { TingAlert } from '../components/TingAlert';
import { useAlert } from '../context/AlertContext';
import {
  playMechanicalClick, playPatternOnce, playCriticalSlam, stopPattern,
} from '../utils/HapticsEngine';
import { createMockAlert, getRandomAlertType } from '../utils/AlertManager';
import type { AlertEvent } from '../context/AlertContext';

const { width: SW, height: SH } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

function formatUptime(start: Date): string {
  const s = Math.floor((Date.now() - start.getTime()) / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

export default function Home() {
  const {
    safetyMode, isAlertActive, currentAlert,
    toggleSafetyMode, triggerAlert, dismissAlert,
    eventPatternMap, userName, sessionStartTime, alertHistory,
  } = useAlert();

  const insets = useSafeAreaInsets();

  // ── Uptime ────────────────────────────────────────────────────────
  const [uptime, setUptime] = useState(() => formatUptime(sessionStartTime));
  useEffect(() => {
    const t = setInterval(() => setUptime(formatUptime(sessionStartTime)), 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  // ── Alert Queue ───────────────────────────────────────────────────
  // Shows one alert at a time. New alerts are queued and shown
  // only after the current one is acknowledged (ACKNOWLEDGED button).
  const [tingVisible, setTingVisible] = useState(false);
  const [displayedAlert, setDisplayedAlert] = useState<AlertEvent | null>(null);
  const alertQueue = useRef<AlertEvent[]>([]);
  const processingRef = useRef(false);

  const showNextAlert = useCallback(() => {
    if (alertQueue.current.length === 0) {
      processingRef.current = false;
      setTingVisible(false);
      setDisplayedAlert(null);
      return;
    }
    const next = alertQueue.current.shift()!;
    setDisplayedAlert(next);
    setTingVisible(true);
    processingRef.current = true;
  }, []);

  // When a new alert fires, enqueue it
  useEffect(() => {
    if (!isAlertActive || !currentAlert) return;
    alertQueue.current.push(currentAlert);
    if (!processingRef.current) {
      showNextAlert();
    }
  }, [currentAlert?.id]);

  const handleTingDismiss = useCallback(() => {
    // Dismiss current TingAlert, then show next in queue after brief pause
    setTingVisible(false);
    setTimeout(() => showNextAlert(), 350);
  }, [showNextAlert]);

  // ── Demo Mode ─────────────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoIndex = useRef(0);
  const demoTypes = useRef(['horn', 'dog', 'siren', 'name_detected'] as const);

  const handleBallTap = () => {
    if (safetyMode) return;
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      if (isDemoMode) {
        if (demoTimer.current) clearInterval(demoTimer.current);
        setIsDemoMode(false);
        stopPattern();
        dismissAlert();
      } else {
        setIsDemoMode(true);
        demoIndex.current = 0;
        const fireDemoAlert = () => {
          const type = demoTypes.current[demoIndex.current % demoTypes.current.length];
          const event = createMockAlert(type, eventPatternMap, userName);
          triggerAlert(event);
          playCriticalSlam();
          playPatternOnce(event.hapticPattern);
          demoIndex.current += 1;
        };
        fireDemoAlert();
        demoTimer.current = setInterval(fireDemoAlert, 5000);
      }
    }
  };

  useEffect(() => {
    if (safetyMode && isDemoMode) {
      if (demoTimer.current) clearInterval(demoTimer.current);
      setIsDemoMode(false);
    }
  }, [safetyMode]);

  useEffect(() => () => {
    if (demoTimer.current) clearInterval(demoTimer.current);
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  // ── Toggle ────────────────────────────────────────────────────────
  const toggleProgress = useSharedValue(safetyMode ? 1 : 0);

  const handleToggle = () => {
    const newMode = !safetyMode;
    toggleProgress.value = withSpring(newMode ? 1 : 0, { damping: 14, stiffness: 120 });
    playMechanicalClick();
    if (isAlertActive && !newMode) { stopPattern(); dismissAlert(); }
    toggleSafetyMode();
  };

  const toggleTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      toggleProgress.value, [0, 1],
      ['rgba(40,40,40,0.9)', 'rgba(255,215,0,0.18)'],
    ),
    borderColor: interpolateColor(
      toggleProgress.value, [0, 1],
      ['rgba(80,80,80,0.5)', 'rgba(255,215,0,0.7)'],
    ),
  }));

  const toggleThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(toggleProgress.value * 32, { damping: 15, stiffness: 160 }) }],
    backgroundColor: interpolateColor(
      toggleProgress.value, [0, 1], ['#444', '#FFD700'],
    ),
  }));

  // ── Ball pulse when armed ─────────────────────────────────────────
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (safetyMode && !isAlertActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ), -1, false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [safetyMode, isAlertActive]);

  const ballWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Glow ──────────────────────────────────────────────────────────
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2200 }),
        withTiming(0.3, { duration: 2200 }),
      ), -1, false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  // ── State Strings ─────────────────────────────────────────────────
  const ballMode = isAlertActive ? 'alert' : safetyMode ? 'armed' : 'idle';

  const stateLabel = isAlertActive ? displayedAlert?.label.toUpperCase() ?? 'ALERT'
    : safetyMode ? 'LISTENING'
    : isDemoMode ? 'SIMULATION'
    : 'STANDBY';

  const stateColor = isAlertActive ? '#FF4444'
    : safetyMode ? '#FFD700'
    : '#555';

  const handleDismissAlert = () => {
    setTingVisible(false);
    stopPattern();
    dismissAlert();
    alertQueue.current = [];
    processingRef.current = false;
    if (isDemoMode) {
      if (demoTimer.current) clearInterval(demoTimer.current);
      setIsDemoMode(false);
    }
  };

  const handleTestAlert = () => {
    if (!safetyMode) return;
    const type = getRandomAlertType();
    const event = createMockAlert(type, eventPatternMap, userName);
    triggerAlert(event);
    playCriticalSlam();
    playPatternOnce(event.hapticPattern);
  };

  return (
    <View style={styles.root}>
      {/* ── Background glow ────────────────────────────── */}
      <AnimatedView
        style={[
          styles.bgGlow,
          { backgroundColor: isAlertActive ? 'rgba(255,68,68,0.07)' : safetyMode ? 'rgba(255,215,0,0.05)' : 'transparent' },
          glowStyle,
        ]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ─────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 14 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>AEGIS</Text>
            <Text style={styles.logoSub}>SENTINEL SYSTEM</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusDot, { backgroundColor: safetyMode ? '#FFD700' : '#333' }]} />
            <Text style={styles.headerStatus}>
              {safetyMode ? 'ARMED' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* ── Central orb area ───────────────────────────── */}
        <View style={styles.orbArea}>
          {/* Glow rings */}
          <View style={[
            styles.glowRing,
            isAlertActive && styles.glowRingAlert,
            safetyMode && !isAlertActive && styles.glowRingArmed,
          ]} />
          <View style={[
            styles.glowRingOuter,
            isAlertActive && styles.glowRingOuterAlert,
          ]} />

          <Pressable onPress={handleBallTap}>
            <AnimatedView style={ballWrapStyle}>
              <AegisBall mode={ballMode} />
            </AnimatedView>
          </Pressable>

          {/* State label below orb */}
          <View style={styles.stateLabelRow}>
            <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
            <Text style={[styles.stateLabelText, { color: stateColor }]}>
              {stateLabel}
            </Text>
          </View>

          {/* dB + event count chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>EVENTS</Text>
              <Text style={styles.chipValue}>{String(alertHistory.length).padStart(3, '0')}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>UPTIME</Text>
              <Text style={styles.chipValue}>{uptime}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>MODE</Text>
              <Text style={styles.chipValue}>{safetyMode ? 'ACTIVE' : 'PASSIVE'}</Text>
            </View>
          </View>
        </View>

        {/* ── Bottom controls ────────────────────────────── */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 72 }]}>

          {/* Demo hint */}
          {!safetyMode && !isDemoMode && (
            <Text style={styles.demoHint}>Triple-tap the orb to run simulation</Text>
          )}

          {/* Demo badge */}
          {isDemoMode && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>SIMULATION ACTIVE · TRIPLE-TAP TO STOP</Text>
            </View>
          )}

          {/* TEST ALERT button — only when armed */}
          {safetyMode && !isAlertActive && !isDemoMode && (
            <TouchableOpacity style={styles.testBtn} onPress={handleTestAlert} activeOpacity={0.75}>
              <Text style={styles.testBtnIcon}>⚡</Text>
              <Text style={styles.testBtnText}>TEST ALERT</Text>
            </TouchableOpacity>
          )}

          {/* DISMISS button — when alert is active */}
          {isAlertActive && (
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismissAlert} activeOpacity={0.75}>
              <Text style={styles.dismissBtnText}>✕  CLEAR ALL ALERTS</Text>
            </TouchableOpacity>
          )}

          {/* Safety Mode Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleCardLabel}>SAFETY MODE</Text>
                <Text style={styles.toggleCardSub}>
                  {safetyMode ? 'Sentinel active — listening for threats' : 'Enable to start environmental monitoring'}
                </Text>
              </View>
              <Pressable onPress={handleToggle} style={styles.toggleHitArea}>
                <AnimatedView style={[styles.toggleTrack, toggleTrackStyle]}>
                  <AnimatedView style={[styles.toggleThumb, toggleThumbStyle]} />
                </AnimatedView>
                <Text style={[styles.toggleState, safetyMode && styles.toggleStateOn]}>
                  {safetyMode ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── TingAlert overlay — one at a time ──────────── */}
      <TingAlert
        visible={tingVisible}
        alert={displayedAlert}
        onDismiss={handleTingDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080808',
  },
  bgGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,215,0,0.08)',
  },
  headerLeft: { gap: 1 },
  logoText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 22,
    color: '#FFD700',
    letterSpacing: 6,
  },
  logoSub: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    color: 'rgba(255,215,0,0.4)',
    letterSpacing: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatus: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  // ── Orb area ─────────────────────────────────────────
  orbArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.06)',
    backgroundColor: 'rgba(255,215,0,0.02)',
  },
  glowRingArmed: {
    borderColor: 'rgba(255,215,0,0.18)',
    backgroundColor: 'rgba(255,215,0,0.04)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
  },
  glowRingAlert: {
    borderColor: 'rgba(255,68,68,0.4)',
    backgroundColor: 'rgba(255,68,68,0.06)',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  glowRingOuter: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.03)',
  },
  glowRingOuterAlert: {
    borderColor: 'rgba(255,68,68,0.12)',
  },
  stateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  stateLabelText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 13,
    letterSpacing: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 80,
  },
  chipLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  chipValue: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },

  // ── Bottom ────────────────────────────────────────────
  bottom: {
    paddingHorizontal: 20,
    gap: 12,
  },
  demoHint: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  demoBadge: {
    backgroundColor: 'rgba(121,245,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(121,245,255,0.25)',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoBadgeText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    color: '#79F5FF',
    letterSpacing: 2,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,215,0,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    borderRadius: 8,
    paddingVertical: 13,
  },
  testBtnIcon: { fontSize: 13 },
  testBtnText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 10,
    color: '#FFD700',
    letterSpacing: 2.5,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.4)',
    borderRadius: 8,
    paddingVertical: 13,
  },
  dismissBtnText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 10,
    color: '#FF6B6B',
    letterSpacing: 2,
  },

  // ── Toggle card ──────────────────────────────────────
  toggleCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    padding: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleCardLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  toggleCardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    maxWidth: 200,
    lineHeight: 14,
  },
  toggleHitArea: {
    alignItems: 'center',
    gap: 4,
  },
  toggleTrack: {
    width: 64,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleState: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },
  toggleStateOn: {
    color: '#FFD700',
  },
});
