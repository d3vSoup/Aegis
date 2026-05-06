// ─── TingAlert.tsx ───────────────────────────────────────────────────
// The "Ting" notification. A highest-priority, over-everything overlay
// that interrupts the user with a dramatic visual announcement,
// showing exactly what sound triggered the alert.
//
// Architecture:
//   - Uses React Native Modal with `presentationStyle="overFullScreen"`
//     so it literally draws on top of every other element in the app.
//   - `statusBarTranslucent={true}` ensures it even covers the status bar.
//   - Paired with expo-av to fire a loud, attention-grabbing sound effect.
//   - Plays `playCriticalSlam()` for maximum haptic impact.
// ─────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import type { AlertEvent } from '../context/AlertContext';
import { playCriticalSlam } from '../utils/HapticsEngine';
import { getAlertSeverity, getAlertDescription } from '../utils/AlertManager';

// ─── Types ───────────────────────────────────────────────────────────
interface TingAlertProps {
  visible: boolean;
  alert: AlertEvent | null;
  onDismiss: () => void;
}

// ─── Alert Metadata Maps ─────────────────────────────────────────────
const ALERT_ICONS: Record<string, string> = {
  siren:         '🚨',
  horn:          '📯',
  dog:           '🐕',
  name_detected: '🎙️',
};

const ALERT_ACCENT: Record<string, string> = {
  siren:         '#FF2D2D',
  horn:          '#FF9500',
  dog:           '#FFD700',
  name_detected: '#00E5FF',
};

const ALERT_SEVERITY_LABEL: Record<string, string> = {
  critical: '⚠ CRITICAL THREAT',
  warning:  '● WARNING',
  info:     '○ ADVISORY',
};

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Component ───────────────────────────────────────────────────────
export function TingAlert({ visible, alert, onDismiss }: TingAlertProps) {
  // ── Animation Values ──────────────────────────────────────────────
  const overlayOpacity  = useSharedValue(0);
  const cardScale       = useSharedValue(0.7);
  const cardOpacity     = useSharedValue(0);
  const pulseScale      = useSharedValue(1);
  const iconBounce      = useSharedValue(0);
  const scanLine        = useSharedValue(-1); // -1 to 1 (top to bottom)

  // ── Mount/Enter Sequence ──────────────────────────────────────────
  useEffect(() => {
    if (visible && alert) {
      // 1. Fire the maximum-strength haptic slam immediately
      playCriticalSlam();

      // 2. Animate the overlay in
      overlayOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });

      // 3. Slam the card into place with an overshoot spring
      cardScale.value   = withSpring(1,   { damping: 12, stiffness: 200, mass: 0.8 });
      cardOpacity.value = withTiming(1,   { duration: 150 });

      // 4. Start the icon bounce animation
      iconBounce.value = withSequence(
        withSpring(-24, { damping: 4, stiffness: 300 }),
        withSpring(0,   { damping: 8, stiffness: 180 }),
      );

      // 5. Start the looping accent pulse
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.00, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );

      // 6. Start the scan-line sweep
      scanLine.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      );
    } else {
      // Animate out
      overlayOpacity.value = withTiming(0, { duration: 200 });
      cardScale.value      = withTiming(0.85, { duration: 150 });
      cardOpacity.value    = withTiming(0, { duration: 150 });
      pulseScale.value     = 1;
      scanLine.value       = -1;
    }
  }, [visible, alert]);

  // ── Animated Styles ───────────────────────────────────────────────
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value },
      { translateY: iconBounce.value },
    ],
  }));

  const scanStyle = useAnimatedStyle(() => ({
    // Translate the scan-line from off-top to off-bottom
    transform: [{ translateY: scanLine.value * 260 }],
  }));

  if (!alert) return null;

  const accent   = ALERT_ACCENT[alert.type]   ?? '#FFD700';
  const icon     = ALERT_ICONS[alert.type]    ?? '⚡';
  const severity = getAlertSeverity(alert.type);
  const sevLabel = ALERT_SEVERITY_LABEL[severity];
  const description = getAlertDescription(alert);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"           // We handle animation manually
      statusBarTranslucent           // Draws over the status bar on Android
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      {/* Dark scrim behind the card */}
      <Animated.View style={[styles.scrim, overlayStyle]}>
        {/* The Alert Card */}
        <Animated.View
          style={[
            styles.card,
            { borderColor: accent, shadowColor: accent },
            cardStyle,
          ]}
        >
          {/* Scan Line effect */}
          <View style={styles.scanContainer} pointerEvents="none">
            <Animated.View style={[styles.scanLine, { backgroundColor: accent }, scanStyle]} />
          </View>

          {/* Top severity badge */}
          <View style={[styles.severityBadge, { backgroundColor: `${accent}22`, borderColor: `${accent}66` }]}>
            <Text style={[styles.severityText, { color: accent }]}>{sevLabel}</Text>
          </View>

          {/* Big icon — animated */}
          <Animated.Text style={[styles.icon, iconStyle]}>{icon}</Animated.Text>

          {/* What triggered it — THE key piece of info */}
          <Text style={[styles.triggerLabel, { color: accent }]}>
            {alert.label.toUpperCase()}
          </Text>

          {/* Sub-info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipLabel}>DECIBELS</Text>
              <Text style={[styles.infoChipValue, { color: accent }]}>{alert.decibels} dB</Text>
            </View>
            {alert.proximity && (
              <View style={styles.infoChip}>
                <Text style={styles.infoChipLabel}>PROXIMITY</Text>
                <Text style={[styles.infoChipValue, { color: accent }]}>{alert.proximity}</Text>
              </View>
            )}
            <View style={styles.infoChip}>
              <Text style={styles.infoChipLabel}>PATTERN</Text>
              <Text style={[styles.infoChipValue, { color: accent }]}>
                {alert.hapticPattern.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>

          {/* Dismiss CTA */}
          <TouchableOpacity
            style={[styles.dismissBtn, { borderColor: accent }]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.dismissBtnText, { color: accent }]}>
              ACKNOWLEDGED
            </Text>
          </TouchableOpacity>

          {/* Corner accent marks */}
          <View style={[styles.cornerTL, { borderColor: accent }]} />
          <View style={[styles.cornerTR, { borderColor: accent }]} />
          <View style={[styles.cornerBL, { borderColor: accent }]} />
          <View style={[styles.cornerBR, { borderColor: accent }]} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    // Glow shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 30,
    overflow: 'hidden',
  },

  // Scan line sweep
  scanContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.18,
  },

  // Severity badge
  severityBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  severityText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    letterSpacing: 2.5,
  },

  // Main icon
  icon: {
    fontSize: 64,
    marginVertical: 8,
  },

  // Trigger label — THE most important piece of info
  triggerLabel: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 26,
    letterSpacing: 3,
    textAlign: 'center',
  },

  // Info chips row
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  infoChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    flex: 1,
  },
  infoChipLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  infoChipValue: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 13,
    letterSpacing: 1,
  },

  // Description
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.3,
    paddingHorizontal: 8,
  },

  // Dismiss button
  dismissBtn: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 2,
  },
  dismissBtnText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 12,
    letterSpacing: 3,
  },

  // Corner accent decorators (military/HUD aesthetic)
  cornerTL: {
    position: 'absolute',
    top: 8, left: 8,
    width: 12, height: 12,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderRadius: 1,
  },
  cornerTR: {
    position: 'absolute',
    top: 8, right: 8,
    width: 12, height: 12,
    borderTopWidth: 2, borderRightWidth: 2,
    borderRadius: 1,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 8, left: 8,
    width: 12, height: 12,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderRadius: 1,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 8, right: 8,
    width: 12, height: 12,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderRadius: 1,
  },
});
