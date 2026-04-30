// ─── About Aegis ──────────────────────────────────────────────────────
// Replaces the old onboarding flow. A beautiful static "About" page
// accessible from the bottom tab bar.
// ─────────────────────────────────────────────────────────────────────

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { AegisBall } from '../components/AegisBall';
import { playPatternOnce } from '../utils/HapticsEngine';

const FEATURE_CARDS = [
  {
    icon: '🎙️',
    title: 'SOUND CLASSIFICATION',
    desc: 'YAMNet-powered on-device ML detects car horns, dog barks, emergency sirens, and your name in real-time.',
    accent: '#FFD700',
  },
  {
    icon: '📳',
    title: 'HAPTIC LANGUAGE',
    desc: 'Every detected sound maps to a unique physical rhythm — Staccato, Siren, or Heartbeat. Your body learns the signals.',
    accent: '#FFD700',
  },
  {
    icon: '🔒',
    title: '100% ON-DEVICE PRIVACY',
    desc: 'No audio is ever recorded, uploaded, or stored. Only timestamped classification results are saved locally on your device.',
    accent: '#4CAF50',
  },
  {
    icon: '📍',
    title: 'SMART SAFE ZONES',
    desc: 'Define GPS-based Safe Zones. Aegis automatically pauses alerts when you are in familiar, low-risk locations.',
    accent: '#00E5FF',
  },
  {
    icon: '⌚',
    title: 'WEARABLE EXTENSION',
    desc: 'Pairs with Apple Watch via Bluetooth to relay haptic alerts directly to your wrist for discreet notifications.',
    accent: '#FF9500',
  },
];

const HAPTIC_DEMOS = [
  { pattern: 'staccato' as const, icon: '💧', label: 'STACCATO', color: '#FF9500', desc: 'Sharp rapid bursts — sudden threats' },
  { pattern: 'siren'    as const, icon: '🌊', label: 'SIREN',    color: '#FF2D2D', desc: 'Oscillating wave — emergency signals' },
  { pattern: 'heartbeat' as const, icon: '💓', label: 'HEARTBEAT', color: '#FFD700', desc: 'Double-thump pulse — personal alerts' },
];

const SDG_BADGES = [
  { num: '03', label: 'GOOD HEALTH', color: '#4CAF50' },
  { num: '09', label: 'INNOVATION',  color: '#FF9500' },
  { num: '10', label: 'EQUALITY',    color: '#E91E63' },
  { num: '11', label: 'SAFE CITIES', color: '#2196F3' },
];

function FeatureCard({ icon, title, desc, accent }: typeof FEATURE_CARDS[0]) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.featureCard, { borderLeftColor: accent, transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.featureIconBg, { backgroundColor: `${accent}18` }]}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <View style={styles.featureTextBlock}>
        <Text style={[styles.featureTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

export default function About() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Section ─── */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <AegisBall mode="idle" />
          <Text style={styles.heroTitle}>Aegis</Text>
          <Text style={styles.heroTagline}>Your 360° Environmental{'\n'}Haptic Sentinel</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionChip}>
              <Text style={styles.versionText}>v1.0.0 · AURA-54</Text>
            </View>
            <View style={[styles.versionChip, { borderColor: 'rgba(76, 175, 80, 0.4)', backgroundColor: 'rgba(76, 175, 80, 0.08)' }]}>
              <Text style={[styles.versionText, { color: '#4CAF50' }]}>ON-DEVICE ONLY</Text>
            </View>
          </View>
        </View>

        {/* ─── Mission Statement ─── */}
        <View style={styles.missionBlock}>
          <View style={styles.missionAccentLine} />
          <Text style={styles.missionText}>
            Aegis translates the world's sounds into a private, physical language — giving people who are
            Deaf, hard of hearing, or in high-noise environments a new sensory layer that is{' '}
            <Text style={styles.missionHighlight}>always on, always private, and entirely theirs.</Text>
          </Text>
        </View>

        {/* ─── Feel the Patterns ─── */}
        <Text style={styles.sectionTitle}>HAPTIC PATTERNS</Text>
        <Text style={styles.sectionSubtitle}>Tap each pattern to feel it on your device</Text>
        <View style={styles.hapticGrid}>
          {HAPTIC_DEMOS.map((demo) => (
            <Pressable
              key={demo.pattern}
              style={({ pressed }) => [
                styles.hapticCard,
                { borderColor: `${demo.color}44` },
                pressed && styles.hapticCardPressed,
              ]}
              onPress={() => playPatternOnce(demo.pattern)}
            >
              <Text style={styles.hapticIcon}>{demo.icon}</Text>
              <Text style={[styles.hapticLabel, { color: demo.color }]}>{demo.label}</Text>
              <Text style={styles.hapticDesc}>{demo.desc}</Text>
              <View style={[styles.tapHint, { borderColor: `${demo.color}44`, backgroundColor: `${demo.color}14` }]}>
                <Text style={[styles.tapHintText, { color: demo.color }]}>TAP TO FEEL</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ─── Features ─── */}
        <Text style={styles.sectionTitle}>CAPABILITIES</Text>
        <View style={styles.featuresSection}>
          {FEATURE_CARDS.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </View>

        {/* ─── SDG Alignment ─── */}
        <Text style={styles.sectionTitle}>UN SDG ALIGNMENT</Text>
        <Text style={styles.sectionSubtitle}>Aegis contributes to 4 Sustainable Development Goals</Text>
        <View style={styles.sdgGrid}>
          {SDG_BADGES.map(({ num, label, color }) => (
            <View key={num} style={[styles.sdgBadge, { borderColor: `${color}50`, backgroundColor: `${color}12` }]}>
              <Text style={[styles.sdgNum, { color }]}>{num}</Text>
              <Text style={[styles.sdgLabel, { color: `${color}CC` }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ─── Tech Stack ─── */}
        <Text style={styles.sectionTitle}>TECHNICAL STACK</Text>
        <View style={styles.techBlock}>
          {[
            { k: 'FRAMEWORK',   v: 'React Native 0.81 · Expo SDK 54' },
            { k: 'INFERENCE',   v: 'TFLite · YAMNet (Stub Ready)' },
            { k: 'HAPTICS',     v: 'expo-haptics · Custom Pattern Engine' },
            { k: 'STORAGE',     v: 'AsyncStorage · 100% Local' },
            { k: 'LOCATION',    v: 'expo-location · Geofencing' },
            { k: 'PLATFORM',    v: 'iOS 16+ · Android 12+' },
          ].map(({ k, v }, i, arr) => (
            <View
              key={k}
              style={[styles.techRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={styles.techKey}>{k}</Text>
              <Text style={styles.techVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>AEGIS · BUILT FOR INCLUSION · 2025</Text>
          <Text style={styles.footerSub}>Expo Go limitations apply to background features.</Text>
          <Text style={styles.footerSub}>A dev build is required for full background notification support.</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // ─── Hero ───────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  heroGlow: {
    position: 'absolute',
    top: 50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 80,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 52,
    color: '#FFD700',
    letterSpacing: -1,
    marginTop: 24,
  },
  heroTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(208, 198, 171, 0.75)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  versionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  versionChip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: '#FFD700',
    letterSpacing: 1.5,
  },

  // ─── Mission ────────────────────────────────────────────────────────
  missionBlock: {
    marginHorizontal: 24,
    marginBottom: 48,
    flexDirection: 'row',
    gap: 16,
  },
  missionAccentLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    opacity: 0.5,
  },
  missionText: {
    flex: 1,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 16,
    color: 'rgba(208, 198, 171, 0.75)',
    lineHeight: 26,
  },
  missionHighlight: {
    color: '#FFD700',
  },

  // ─── Section Headers ────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'rgba(208, 198, 171, 0.5)',
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(208, 198, 171, 0.45)',
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  // ─── Haptic Grid ────────────────────────────────────────────────────
  hapticGrid: {
    flexDirection: 'column',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  hapticCard: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hapticCardPressed: {
    backgroundColor: '#222',
  },
  hapticIcon: { fontSize: 26, width: 34, textAlign: 'center' },
  hapticLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  hapticDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(208, 198, 171, 0.5)',
    flex: 1,
    lineHeight: 15,
  },
  tapHint: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tapHintText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    letterSpacing: 1.2,
  },

  // ─── Features ───────────────────────────────────────────────────────
  featuresSection: {
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 48,
  },
  featureCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureIcon: { fontSize: 20 },
  featureTextBlock: { flex: 1 },
  featureTitle: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  featureDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(208, 198, 171, 0.6)',
    lineHeight: 17,
  },

  // ─── SDG Grid ───────────────────────────────────────────────────────
  sdgGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 48,
    flexWrap: 'wrap',
  },
  sdgBadge: {
    flex: 1,
    minWidth: '20%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sdgNum: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 22,
    letterSpacing: -1,
  },
  sdgLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 7,
    letterSpacing: 1.2,
    marginTop: 4,
    textAlign: 'center',
  },

  // ─── Tech Stack ─────────────────────────────────────────────────────
  techBlock: {
    marginHorizontal: 24,
    backgroundColor: '#181818',
    borderRadius: 12,
    marginBottom: 48,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.07)',
  },
  techKey: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(208, 198, 171, 0.45)',
    letterSpacing: 1.5,
  },
  techVal: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
    color: 'rgba(208, 198, 171, 0.85)',
    letterSpacing: 0.3,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  // ─── Footer ─────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  footerLine: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    marginBottom: 8,
  },
  footerText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: 'rgba(255, 215, 0, 0.4)',
    letterSpacing: 2,
  },
  footerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(208, 198, 171, 0.3)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
