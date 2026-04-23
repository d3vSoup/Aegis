import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { AegisBall } from '../components/AegisBall';
import { markOnboarded } from '../services/StorageService';
import {
  playPatternOnce,
  playMechanicalClick,
} from '../utils/HapticsEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Slide Data ───────────────────────────────────────────────────────
const HAPTIC_DEMOS: Array<{
  pattern: 'staccato' | 'siren' | 'heartbeat';
  icon: string;
  label: string;
  desc: string;
}> = [
  {
    pattern: 'staccato',
    icon: '💧',
    label: 'STACCATO',
    desc: 'Sharp, rapid-fire bursts. Used for sudden, immediate threats like car horns.',
  },
  {
    pattern: 'siren',
    icon: '🌊',
    label: 'SIREN',
    desc: 'An oscillating wave. Used for sustained emergency frequencies.',
  },
  {
    pattern: 'heartbeat',
    icon: '💓',
    label: 'HEARTBEAT',
    desc: 'A double-tap thump. Used for personal awareness like your name being called.',
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      goToSlide(currentSlide + 1);
      playMechanicalClick();
    }
  };

  const handleActivate = async () => {
    playMechanicalClick();
    await markOnboarded();
    router.replace('/');
  };

  // ─── Slide 1: The Shield ──────────────────────────────────────────
  const renderSlide1 = () => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={styles.ballContainer}>
          <AegisBall mode="idle" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.slideTag}>01 / 03 · THE SHIELD</Text>
          <Text style={styles.slideTitle}>Your 360°{'\n'}Haptic Sense</Text>
          <Text style={styles.slideBody}>
            Aegis is an environmental monitoring framework that translates the sounds around you into
            distinct physical sensations — an invisible shield against the noise.
          </Text>
          <Text style={styles.slideBody}>
            It runs entirely on your device. No microphone data is ever transmitted or stored as audio.
            Only classification results are logged locally.
          </Text>
        </View>
      </View>
    </View>
  );

  // ─── Slide 2: The Language ────────────────────────────────────────
  const renderSlide2 = () => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={styles.textBlock}>
          <Text style={styles.slideTag}>02 / 03 · THE LANGUAGE</Text>
          <Text style={styles.slideTitle}>The{'\n'}Haptic Syntax</Text>
          <Text style={styles.slideBody}>
            Every sound type maps to a unique physical rhythm. Tap each pattern below to feel it.
          </Text>
        </View>

        <View style={styles.hapticDemoGrid}>
          {HAPTIC_DEMOS.map((demo) => (
            <Pressable
              key={demo.pattern}
              style={styles.hapticCard}
              onPress={() => playPatternOnce(demo.pattern)}
            >
              <Text style={styles.hapticIcon}>{demo.icon}</Text>
              <Text style={styles.hapticLabel}>{demo.label}</Text>
              <Text style={styles.hapticDesc}>{demo.desc}</Text>
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>TAP TO FEEL</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  // ─── Slide 3: Activate ────────────────────────────────────────────
  const renderSlide3 = () => (
    <View style={styles.slide}>
      <View style={styles.slideContent}>
        <View style={styles.ballContainer}>
          <AegisBall mode="armed" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.slideTag}>03 / 03 · ARM THE SENTINEL</Text>
          <Text style={styles.slideTitle}>Ready to{'\n'}Deploy?</Text>
          <Text style={styles.slideBody}>
            Enable Safety Mode on the home screen to begin monitoring. The orb will shift to its
            "ARMED" state and the inference engine will begin listening.
          </Text>
          <Text style={[styles.slideBody, { color: Colors.primaryContainer }]}>
            Triple-tap the orb at any time to run a full demo simulation.
          </Text>
        </View>

        <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
          <Text style={styles.activateButtonText}>ACTIVATE AEGIS</Text>
        </TouchableOpacity>

        <Text style={styles.activateHint}>
          You can revisit this guide from Settings → About Aegis.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {renderSlide1()}
        {renderSlide2()}
        {renderSlide3()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Pressable key={i} onPress={() => goToSlide(i)}>
              <View style={[styles.dot, currentSlide === i && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        {/* Next / Done */}
        {currentSlide < 2 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>NEXT →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={handleActivate}>
            <Text style={styles.skipText}>SKIP INTRO</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Skip (slides 1 & 2 only) */}
      {currentSlide < 2 && (
        <TouchableOpacity style={styles.headerSkip} onPress={handleActivate}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 120,
  },
  slideContent: { flex: 1 },
  ballContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: -20,
  },
  textBlock: { marginBottom: 32 },
  slideTag: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: Colors.outlineVariant,
    letterSpacing: 2,
    marginBottom: 12,
  },
  slideTitle: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 44,
    color: Colors.primaryContainer,
    letterSpacing: -1,
    lineHeight: 50,
    marginBottom: 20,
  },
  slideBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 12,
  },

  // ─── Haptic Demo ─────────────────────────────────────────────────
  hapticDemoGrid: { gap: 12 },
  hapticCard: {
    backgroundColor: '#1b1b1b',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 71, 50, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hapticIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  hapticLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    color: Colors.primaryContainer,
    letterSpacing: 2,
    marginBottom: 4,
  },
  hapticDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    flex: 1,
  },
  tapHint: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tapHintText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    color: Colors.primaryContainer,
    letterSpacing: 1.5,
  },

  // ─── Activate Button ──────────────────────────────────────────────
  activateButton: {
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  activateButtonText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 13,
    color: Colors.onPrimary,
    letterSpacing: 3,
  },
  activateHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ─── Bottom Nav ───────────────────────────────────────────────────
  bottomNav: {
    position: 'absolute',
    bottom: 48,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.outlineVariant,
  },
  dotActive: {
    backgroundColor: Colors.primaryContainer,
    width: 20,
    borderRadius: 3,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextButtonText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 11,
    color: Colors.primaryContainer,
    letterSpacing: 2,
  },
  headerSkip: { position: 'absolute', top: 52, right: 28 },
  skipButton: {},
  skipText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.outlineVariant,
    letterSpacing: 2,
  },
});
