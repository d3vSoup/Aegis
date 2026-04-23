import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  interpolate,
  Easing,
  cancelAnimation,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedView = Animated.createAnimatedComponent(View);

// ─── Constants ───────────────────────────────────────────────────────
const BALL_SIZE = 220;
const SOLAR_GOLD = '#FFD700';
const DARK_GOLD = '#B8860B';
const ALERT_RED = '#FF4444';

type AegisBallMode = 'idle' | 'armed' | 'alert';

interface AegisBallProps {
  mode: AegisBallMode;
  style?: any;
}

export function AegisBall({ mode, style }: AegisBallProps) {
  // ─── Shared Values ─────────────────────────────────────────────────
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const alertShake = useSharedValue(0);
  const waveformPhase = useSharedValue(0);
  const innerGlow = useSharedValue(0.4);

  // ─── Animation Control ────────────────────────────────────────────
  useEffect(() => {
    // Cancel previous animations
    cancelAnimation(rotation);
    cancelAnimation(pulseScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(alertShake);
    cancelAnimation(waveformPhase);
    cancelAnimation(innerGlow);

    switch (mode) {
      case 'idle':
        // Slow Y-axis rotation
        rotation.value = withRepeat(
          withTiming(360, { duration: 12000, easing: Easing.linear }),
          -1,
          false,
        );
        // Gentle pulse
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        // Soft glow
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.35, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        alertShake.value = withTiming(0, { duration: 300 });
        waveformPhase.value = 0;
        innerGlow.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.3, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        break;

      case 'armed':
        // Medium rotation (1.5x idle)
        rotation.value = withRepeat(
          withTiming(360, { duration: 8000, easing: Easing.linear }),
          -1,
          false,
        );
        // Tighter pulse
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.98, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        // Brighter glow
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        alertShake.value = withTiming(0, { duration: 300 });
        // Radar sweep
        waveformPhase.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1,
          false,
        );
        innerGlow.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        break;

      case 'alert':
        // Triple speed rotation
        rotation.value = withRepeat(
          withTiming(360, { duration: 4000, easing: Easing.linear }),
          -1,
          false,
        );
        // Aggressive pulse
        pulseScale.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 400, easing: Easing.out(Easing.exp) }),
            withTiming(0.92, { duration: 400, easing: Easing.in(Easing.exp) }),
          ),
          -1,
          false,
        );
        // Intense glow
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 300, easing: Easing.out(Easing.exp) }),
            withTiming(0.4, { duration: 300, easing: Easing.in(Easing.exp) }),
          ),
          -1,
          false,
        );
        // X-Z axis agitation / shaking
        alertShake.value = withRepeat(
          withSequence(
            withSpring(8, { damping: 2, stiffness: 400 }),
            withSpring(-8, { damping: 2, stiffness: 400 }),
            withSpring(5, { damping: 3, stiffness: 300 }),
            withSpring(-5, { damping: 3, stiffness: 300 }),
          ),
          -1,
          false,
        );
        // Fast waveform
        waveformPhase.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false,
        );
        innerGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 300, easing: Easing.out(Easing.exp) }),
            withTiming(0.5, { duration: 300, easing: Easing.in(Easing.exp) }),
          ),
          -1,
          false,
        );
        break;
    }
  }, [mode]);

  // ─── Derived color value ───────────────────────────────────────────
  const isAlert = mode === 'alert';

  // ─── Animated Styles ──────────────────────────────────────────────
  const ballContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value },
      { translateX: alertShake.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
      { scale: interpolate(glowOpacity.value, [0.15, 0.9], [1.2, 1.6]) },
    ],
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 0.7}deg` }],
    opacity: interpolate(pulseScale.value, [0.92, 1.12], [0.3, 0.8]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value * 0.5}deg` }],
    opacity: interpolate(pulseScale.value, [0.92, 1.12], [0.2, 0.6]),
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 0.3}deg` }],
    opacity: interpolate(pulseScale.value, [0.92, 1.12], [0.1, 0.4]),
  }));

  const radarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveformPhase.value}deg` }],
    opacity: mode === 'idle' ? 0 : 0.6,
  }));

  // ─── Render ───────────────────────────────────────────────────────
  const primaryColor = isAlert ? ALERT_RED : SOLAR_GOLD;
  const secondaryColor = isAlert ? '#FF6B6B' : DARK_GOLD;

  return (
    <View style={[styles.container, style]}>
      {/* Outer Glow */}
      <AnimatedView style={[styles.outerGlow, outerGlowStyle, {
        shadowColor: primaryColor,
        backgroundColor: isAlert ? 'rgba(255, 68, 68, 0.06)' : 'rgba(255, 215, 0, 0.06)',
      }]} />

      {/* Main Ball Container */}
      <AnimatedView style={[styles.ballContainer, ballContainerStyle]}>
        {/* SVG Sphere with Concentric Circles */}
        <Svg width={BALL_SIZE} height={BALL_SIZE} viewBox={`0 0 ${BALL_SIZE} ${BALL_SIZE}`}>
          {/* Background circle — the sphere body */}
          <Circle
            cx={BALL_SIZE / 2}
            cy={BALL_SIZE / 2}
            r={BALL_SIZE / 2 - 10}
            fill="rgba(20, 20, 20, 0.9)"
            stroke={primaryColor}
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />

          {/* Inner circles for 3D depth illusion */}
          <G opacity={0.15}>
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={85} fill="none" stroke={primaryColor} strokeWidth={0.5} />
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={70} fill="none" stroke={primaryColor} strokeWidth={0.5} />
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={55} fill="none" stroke={primaryColor} strokeWidth={0.4} />
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={40} fill="none" stroke={primaryColor} strokeWidth={0.3} />
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2} r={25} fill="none" stroke={primaryColor} strokeWidth={0.2} />
          </G>

          {/* Latitude lines — rotated ellipses for 3D effect */}
          <G opacity={0.1}>
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2 - 30} r={72} fill="none" stroke={secondaryColor} strokeWidth={0.4} strokeDasharray="4 8" />
            <Circle cx={BALL_SIZE / 2} cy={BALL_SIZE / 2 + 30} r={72} fill="none" stroke={secondaryColor} strokeWidth={0.4} strokeDasharray="4 8" />
          </G>

          {/* Center core glow */}
          <Circle
            cx={BALL_SIZE / 2}
            cy={BALL_SIZE / 2}
            r={12}
            fill={primaryColor}
            opacity={0.6}
          />
          <Circle
            cx={BALL_SIZE / 2}
            cy={BALL_SIZE / 2}
            r={6}
            fill={primaryColor}
            opacity={0.9}
          />

          {/* Specular highlight — top-left */}
          <Circle
            cx={BALL_SIZE / 2 - 30}
            cy={BALL_SIZE / 2 - 35}
            r={18}
            fill="rgba(255, 255, 255, 0.04)"
          />
        </Svg>
      </AnimatedView>

      {/* Orbiting Rings */}
      <AnimatedView style={[styles.orbitRing, styles.ring1, ring1Style, { borderColor: primaryColor }]} />
      <AnimatedView style={[styles.orbitRing, styles.ring2, ring2Style, { borderColor: secondaryColor }]} />
      <AnimatedView style={[styles.orbitRing, styles.ring3, ring3Style, { borderColor: primaryColor }]} />

      {/* Radar Sweep Line (armed & alert only) */}
      <AnimatedView style={[styles.radarSweep, radarStyle]}>
        <View style={[styles.radarLine, { backgroundColor: primaryColor }]} />
      </AnimatedView>

      {/* Inner Glow Overlay */}
      <AnimatedView style={[styles.innerGlow, innerGlowStyle, {
        borderColor: primaryColor,
      }]} pointerEvents="none" />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: BALL_SIZE + 60,
    height: BALL_SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: BALL_SIZE + 40,
    height: BALL_SIZE + 40,
    borderRadius: (BALL_SIZE + 40) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 20,
  },
  ballContainer: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  ring1: {
    width: BALL_SIZE + 30,
    height: BALL_SIZE + 30,
    borderRadius: (BALL_SIZE + 30) / 2,
  },
  ring2: {
    width: BALL_SIZE + 50,
    height: BALL_SIZE + 50,
    borderRadius: (BALL_SIZE + 50) / 2,
  },
  ring3: {
    width: BALL_SIZE + 20,
    height: BALL_SIZE + 20,
    borderRadius: (BALL_SIZE + 20) / 2,
  },
  radarSweep: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    alignItems: 'center',
  },
  radarLine: {
    width: 1,
    height: BALL_SIZE / 2,
    opacity: 0.4,
  },
  innerGlow: {
    position: 'absolute',
    width: BALL_SIZE - 10,
    height: BALL_SIZE - 10,
    borderRadius: (BALL_SIZE - 10) / 2,
    borderWidth: 1,
  },
});
