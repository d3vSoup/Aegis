import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { TopAppBar } from '../components/TopAppBar';
import { useAlert } from '../context/AlertContext';
import type { HapticPattern, EventPatternMap } from '../context/AlertContext';
import {
  playPatternOnce,
  playSelectionTick,
  getPatternDisplayName,
  getPatternIcon,
} from '../utils/HapticsEngine';
import { CONFIDENCE_THRESHOLDS } from '../constants/AcousticTiers';
import { resetAll } from '../services/StorageService';
import {
  getStatus as getWearableStatus,
  startScan,
  stopScan,
  onStatusChange,
} from '../services/WearableService';
import type { WearableStatus } from '../services/WearableService';
import { getCurrentActivity } from '../services/ActivityService';
import type { ActivityState } from '../services/ActivityService';

// ─── Constants ───────────────────────────────────────────────────────
const ALL_PATTERNS: HapticPattern[] = ['staccato', 'siren', 'heartbeat'];

const PATTERN_DESCRIPTIONS: Record<HapticPattern, string> = {
  staccato: 'Sharp, immediate sensory bursts tied to discrete environmental data points.',
  siren: 'Fluid, oscillating feedback that maps the overall density of the local grid.',
  heartbeat: 'Rhythmic double-tap pulses synchronized to detected acoustic signatures.',
};

const EVENT_LABELS: Record<keyof EventPatternMap, { label: string; icon: string }> = {
  horn: { label: 'Car Horn', icon: '🚗' },
  dog: { label: 'Dog Bark', icon: '🐕' },
  siren: { label: 'Emergency Siren', icon: '🚨' },
  name: { label: 'Name Detected', icon: '🗣️' },
};

// Event type key to AlertEventType mapping for threshold display
const EVENT_THRESHOLD_KEY: Record<keyof EventPatternMap, string> = {
  horn: 'horn',
  dog: 'dog',
  siren: 'siren',
  name: 'name_detected',
};

export default function Settings() {
  const {
    defaultHapticPattern,
    setDefaultPattern,
    sensitivity,
    setSensitivity,
    userName,
    setUserName,
    eventPatternMap,
    setEventPattern,
    alertHistory,
    clearHistory,
    safeZones,
    addSafeZone,
    removeSafeZone,
    isInSafeZone,
  } = useAlert();

  const [nameInput, setNameInput] = useState(userName);
  const [cachePressed, setCachePressed] = useState(false);
  const [zoneNameInput, setZoneNameInput] = useState('');
  const [wearableStatus, setWearableStatus] = useState<WearableStatus>(getWearableStatus);
  const [activity, setActivity] = useState<ActivityState>('stationary');

  // ─── Wearable Status Subscription ────────────────────────────────
  useEffect(() => {
    onStatusChange((status) => setWearableStatus(status));
  }, []);

  // ─── Activity Poll ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setActivity(getCurrentActivity()), 5000);
    return () => clearInterval(t);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handlePatternSelect = (pattern: HapticPattern) => {
    setDefaultPattern(pattern);
    playPatternOnce(pattern);
  };

  const handleEventPatternCycle = (event: keyof EventPatternMap) => {
    const current = eventPatternMap[event];
    const idx = ALL_PATTERNS.indexOf(current);
    const next = ALL_PATTERNS[(idx + 1) % ALL_PATTERNS.length];
    setEventPattern(event, next);
    playSelectionTick();
  };

  const handleTestEventPattern = (event: keyof EventPatternMap) => {
    const pattern = eventPatternMap[event];
    playPatternOnce(pattern);
  };

  const handleNameSubmit = () => {
    setUserName(nameInput.trim());
    playSelectionTick();
  };

  const handleCachePurge = () => {
    Alert.alert(
      'Purge All History',
      `This will permanently erase all ${alertHistory.length} logged event${alertHistory.length !== 1 ? 's' : ''}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'PURGE',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            playSelectionTick();
          },
        },
      ],
    );
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset',
      'This will erase all Aegis data including history, preferences, and onboarding status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET ALL',
          style: 'destructive',
          onPress: async () => {
            clearHistory();
            await resetAll();
            playSelectionTick();
          },
        },
      ],
    );
  };

  // ─── Sensitivity Display ──────────────────────────────────────────
  const dbValue = (-60 + (sensitivity / 100) * 50).toFixed(1);

  return (
    <View style={styles.container}>
      <TopAppBar subtitle="SECURE_LINK_ACTIVE" battery="🔋" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>System Configuration & Haptics</Text>
        </View>

        {/* ═══ User Name Input ═══ */}
        <View style={styles.nameSection}>
          <Text style={styles.sectionLabel}>SOUND CATCHER — USER NAME</Text>
          <Text style={styles.sectionDesc}>
            The sentinel will alert you when this name is detected in the environment.
          </Text>

          <View style={styles.nameInputRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={handleNameSubmit}
              onSubmitEditing={handleNameSubmit}
              placeholder="Enter your name..."
              placeholderTextColor="rgba(208, 198, 171, 0.3)"
              autoCapitalize="words"
              returnKeyType="done"
            />
            {nameInput.trim() !== '' && nameInput.trim() !== userName && (
              <TouchableOpacity style={styles.saveButton} onPress={handleNameSubmit}>
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            )}
          </View>

          {userName !== '' && (
            <View style={styles.nameActiveRow}>
              <View style={styles.activeIndicator} />
              <Text style={styles.nameActiveText}>Monitoring for "{userName}"</Text>
            </View>
          )}
        </View>

        {/* ═══ Sensitivity Slider ═══ */}
        <View style={styles.sensitivitySection}>
          <View style={styles.sensHeader}>
            <View>
              <Text style={styles.sensLabel}>NATIVE LAYER SENSITIVITY</Text>
              <Text style={styles.sensDesc}>Adjust the threshold for environmental haptic synthesis.</Text>
            </View>
            <Text style={styles.sensValue}>
              {dbValue} <Text style={styles.sensUnit}>dB</Text>
            </Text>
          </View>

          <View style={styles.sliderContainer}>
            <Pressable
              style={styles.sliderTouchArea}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const width = 300;
                const pct = Math.max(0, Math.min(100, (locationX / width) * 100));
                setSensitivity(Math.round(pct));
                playSelectionTick();
              }}
            >
              <View style={styles.sliderLine} />
              <View style={[styles.sliderFill, { width: `${sensitivity}%` }]} />
              <View style={[styles.sliderThumb, { left: `${sensitivity}%` }]} />
            </Pressable>
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>MIN_GAIN</Text>
            <Text style={styles.sliderLabelText}>NOMINAL_ZERO</Text>
            <Text style={styles.sliderLabelText}>MAX_PEAK</Text>
          </View>
        </View>

        {/* ═══ Default Haptic Pattern ═══ */}
        <Text style={styles.sectionTitle}>HAPTIC PATTERN</Text>
        <View style={styles.patternGrid}>
          {ALL_PATTERNS.map((pattern) => {
            const isActive = pattern === defaultHapticPattern;
            return (
              <TouchableOpacity
                key={pattern}
                style={[styles.patternCard, isActive && styles.patternCardActive]}
                onPress={() => handlePatternSelect(pattern)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>ACTIVE</Text>
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <Text style={styles.patternIcon}>{getPatternIcon(pattern)}</Text>
                  {isActive && <View style={styles.activePulse} />}
                </View>
                <Text style={[styles.patternTitle, isActive && styles.patternTitleActive]}>
                  {getPatternDisplayName(pattern).toUpperCase()}
                </Text>
                <Text style={styles.patternDesc}>{PATTERN_DESCRIPTIONS[pattern]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ Event → Pattern Mapping ═══ */}
        <Text style={styles.sectionTitle}>EVENT MAPPING</Text>
        <Text style={styles.sectionDescSmall}>
          Assign a haptic rhythm to each event type. Tap the pattern to cycle, or "TEST" to preview.
        </Text>

        <View style={styles.eventMapSection}>
          {(Object.keys(EVENT_LABELS) as Array<keyof EventPatternMap>).map((event) => {
            const { label, icon } = EVENT_LABELS[event];
            const assignedPattern = eventPatternMap[event];
            const thresholdKey = EVENT_THRESHOLD_KEY[event] as keyof typeof CONFIDENCE_THRESHOLDS;
            const threshold = CONFIDENCE_THRESHOLDS[thresholdKey];

            return (
              <View key={event} style={styles.eventRow}>
                <View style={styles.eventRowLeft}>
                  <View style={styles.eventIconBg}>
                    <Text style={styles.eventIcon}>{icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.eventName}>{label}</Text>
                    <TouchableOpacity onPress={() => handleEventPatternCycle(event)}>
                      <Text style={styles.eventPattern}>
                        {getPatternIcon(assignedPattern)}{' '}
                        {getPatternDisplayName(assignedPattern).toUpperCase()}
                        {'  '}
                        <Text style={styles.cycleHint}>↻</Text>
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.thresholdLabel}>
                      CONFIDENCE: {Math.round(threshold * 100)}%
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.testEventButton}
                  onPress={() => handleTestEventPattern(event)}
                >
                  <Text style={styles.testEventText}>TEST</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ═══ Model Management ═══ */}
        <View style={styles.managementSection}>
          <Text style={styles.mgmtTitle}>MODEL MANAGEMENT</Text>

          <View style={styles.mgmtRow}>
            <View style={styles.mgmtRowLeft}>
              <View style={styles.mgmtIconBg}>
                <Text style={styles.mgmtIcon}>⬇️</Text>
              </View>
              <View>
                <Text style={styles.mgmtItemTitle}>AEGIS_OS_V2.4</Text>
                <Text style={styles.mgmtItemSub}>INFERENCE ENGINE · STUBBED</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>READY</Text>
            </View>
          </View>

          <View style={styles.mgmtRow}>
            <View style={styles.mgmtRowLeft}>
              <View style={styles.mgmtIconBg}>
                <Text style={styles.mgmtIconActive}>📦</Text>
              </View>
              <View>
                <Text style={styles.mgmtItemTitle}>Event Log Cache</Text>
                <View style={styles.cacheCountRow}>
                  <Text style={styles.mgmtItemSub}>{alertHistory.length} EVENTS STORED</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.button, alertHistory.length === 0 && styles.buttonDisabled]}
              onPress={handleCachePurge}
              disabled={alertHistory.length === 0}
            >
              <Text style={styles.buttonText}>PURGE</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.mgmtRow, { opacity: 0.6 }]}>
            <View style={styles.mgmtRowLeft}>
              <View style={styles.mgmtIconBg}>
                <Text style={styles.mgmtIcon}>⚠️</Text>
              </View>
              <View>
                <Text style={styles.mgmtItemTitle}>Factory Reset</Text>
                <Text style={styles.mgmtItemSub}>WIPES ALL DATA & PREFERENCES</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buttonDanger} onPress={handleFactoryReset}>
              <Text style={styles.buttonDangerText}>RESET</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Geofencing / Safe Zones ═══ */}
        <View style={styles.managementSection}>
          <Text style={styles.mgmtTitle}>SAFE ZONES (GEOFENCING)</Text>
          <Text style={styles.sectionDescSmall} style={{ marginBottom: 16, marginTop: -8 }}>
            Alerts are automatically paused when you are inside these GPS regions.
          </Text>

          {safeZones.map((zone) => (
            <View key={zone.id} style={styles.mgmtRow}>
              <View style={styles.mgmtRowLeft}>
                <View style={styles.mgmtIconBg}>
                  <Text style={styles.mgmtIconActive}>📍</Text>
                </View>
                <View>
                  <Text style={styles.mgmtItemTitle}>{zone.name}</Text>
                  <Text style={styles.mgmtItemSub}>
                    {zone.radiusMeters}m RADIUS
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.buttonDanger}
                onPress={() => removeSafeZone(zone.id)}
              >
                <Text style={styles.buttonDangerText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addZoneRow}>
            <TextInput
              style={styles.zoneInput}
              value={zoneNameInput}
              onChangeText={setZoneNameInput}
              placeholder="E.g. Home, Office..."
              placeholderTextColor="rgba(208, 198, 171, 0.3)"
            />
            <TouchableOpacity
              style={[styles.button, !zoneNameInput.trim() && styles.buttonDisabled]}
              onPress={() => {
                if (!zoneNameInput.trim()) return;
                addSafeZone(zoneNameInput.trim());
                setZoneNameInput('');
              }}
              disabled={!zoneNameInput.trim()}
            >
              <Text style={styles.buttonText}>ADD CURRENT LOCATION</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ Wearable Integration ═══ */}
        <View style={styles.managementSection}>
          <Text style={styles.mgmtTitle}>WEARABLE LINK</Text>

          <View style={styles.mgmtRow}>
            <View style={styles.mgmtRowLeft}>
              <View style={styles.mgmtIconBg}>
                <Text style={wearableStatus === 'connected' ? styles.mgmtIconActive : styles.mgmtIcon}>
                  ⌚
                </Text>
              </View>
              <View>
                <Text style={styles.mgmtItemTitle}>
                  {wearableStatus === 'connected' ? 'WATCH PAIRED' : 'AEGIS COMPANION'}
                </Text>
                <Text style={styles.mgmtItemSub}>STATUS: {wearableStatus.toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.button, wearableStatus === 'unavailable' && styles.buttonDisabled]}
              onPress={() => {
                if (wearableStatus === 'disconnected') startScan();
                else if (wearableStatus === 'scanning') stopScan();
              }}
              disabled={wearableStatus === 'unavailable'}
            >
              <Text style={styles.buttonText}>
                {wearableStatus === 'scanning' ? 'STOP' : 'SCAN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ About Aegis ═══ */}
        <View style={styles.aboutSection}>
          <Text style={styles.mgmtTitle}>ABOUT AEGIS</Text>
          <View style={styles.aboutBlock}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>VERSION</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>BUILD</Text>
              <Text style={styles.aboutValue}>AURA-54.0 · EXPO SDK 54</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>FRAMEWORK</Text>
              <Text style={styles.aboutValue}>React Native 0.81.5</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>INFERENCE</Text>
              <Text style={styles.aboutValue}>TFLite (STUB READY)</Text>
            </View>
            <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.aboutLabel}>PRIVACY</Text>
              <Text style={[styles.aboutValue, { color: '#4CAF50' }]}>100% ON-DEVICE</Text>
            </View>
          </View>

          {/* SDG Alignment Badges */}
          <Text style={[styles.mgmtTitle, { marginTop: 20 }]}>SDG ALIGNMENT</Text>
          <View style={styles.sdgRow}>
            {[
              { num: '03', label: 'HEALTH' },
              { num: '09', label: 'INNOVATION' },
              { num: '10', label: 'EQUALITY' },
              { num: '11', label: 'CITIES' },
            ].map(({ num, label }) => (
              <View key={num} style={styles.sdgBadge}>
                <Text style={styles.sdgNum}>{num}</Text>
                <Text style={styles.sdgLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerDecoration}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>END_OF_SEQUENCE_00421X</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },
  headerArea: { marginBottom: 40 },
  title: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 48,
    color: Colors.primaryContainer,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    color: Colors.onSurface,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
  },
  sectionDescSmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
    marginTop: -8,
    lineHeight: 16,
  },
  nameSection: {
    backgroundColor: '#1b1b1b',
    padding: 24,
    marginBottom: 32,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryContainer,
  },
  nameInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameInput: {
    flex: 1,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    color: Colors.primaryContainer,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveButton: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 8 },
  saveButtonText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 10,
    color: Colors.onPrimary,
    letterSpacing: 1.5,
  },
  nameActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  nameActiveText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: Colors.onSurfaceVariant, letterSpacing: 1 },
  sensitivitySection: {
    backgroundColor: '#1b1b1b',
    padding: 24,
    marginBottom: 40,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 215, 0, 0.3)',
  },
  sensHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 },
  sensLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: Colors.onSurface, letterSpacing: 1.5, marginBottom: 4 },
  sensDesc: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.onSurfaceVariant },
  sensValue: { fontFamily: 'SpaceMono_400Regular', fontSize: 24, color: Colors.primaryContainer, letterSpacing: -1 },
  sensUnit: { fontSize: 10 },
  sliderContainer: { marginBottom: 8 },
  sliderTouchArea: { position: 'relative', height: 48, justifyContent: 'center' },
  sliderLine: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(77, 71, 50, 0.3)' },
  sliderFill: { position: 'absolute', height: 1, backgroundColor: Colors.primaryContainer, opacity: 0.6 },
  sliderThumb: { position: 'absolute', width: 2, height: 20, backgroundColor: Colors.primaryContainer, zIndex: 10, marginLeft: -1 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderLabelText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: 'rgba(208, 198, 171, 0.5)' },
  patternGrid: { flexDirection: 'row', gap: 12, marginBottom: 40, flexWrap: 'wrap' },
  patternCard: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#1b1b1b',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(77, 71, 50, 0.1)',
  },
  patternCardActive: { borderColor: 'rgba(255, 215, 0, 0.5)', backgroundColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  patternIcon: { fontSize: 16 },
  activePulse: {
    width: 8, height: 8,
    backgroundColor: Colors.primaryContainer,
    borderRadius: 4,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  activeTag: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primaryContainer, paddingHorizontal: 6, paddingVertical: 3, zIndex: 2 },
  activeTagText: { fontFamily: 'SpaceMono_400Regular', fontSize: 7, color: Colors.onPrimary, letterSpacing: 1 },
  patternTitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: Colors.onSurface, letterSpacing: 1.5, marginBottom: 6 },
  patternTitleActive: { color: Colors.primaryContainer },
  patternDesc: { fontFamily: 'Inter_400Regular', fontSize: 9, color: Colors.onSurfaceVariant, lineHeight: 14 },
  eventMapSection: { gap: 12, marginBottom: 40 },
  eventRow: { backgroundColor: '#1b1b1b', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  eventIconBg: { width: 40, height: 40, backgroundColor: '#353535', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  eventIcon: { fontSize: 18 },
  eventName: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, color: Colors.onSurface, letterSpacing: 1, marginBottom: 4 },
  eventPattern: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: Colors.primaryContainer, letterSpacing: 1 },
  cycleHint: { color: Colors.onSurfaceVariant, fontSize: 11 },
  thresholdLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: Colors.outlineVariant, letterSpacing: 1, marginTop: 3 },
  testEventButton: { borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', paddingHorizontal: 14, paddingVertical: 6 },
  testEventText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: Colors.primaryContainer, letterSpacing: 2 },
  managementSection: { gap: 16, marginBottom: 40 },
  mgmtTitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mgmtRow: { backgroundColor: '#1b1b1b', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mgmtRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mgmtIconBg: { width: 40, height: 40, backgroundColor: '#353535', alignItems: 'center', justifyContent: 'center' },
  mgmtIcon: { fontSize: 16, color: Colors.onSurfaceVariant },
  mgmtIconActive: { fontSize: 16, color: Colors.primaryContainer },
  mgmtItemTitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: Colors.onSurface },
  mgmtItemSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: Colors.onSurfaceVariant, marginTop: 4 },
  cacheCountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusBadge: { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.4)', paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: '#4CAF50', letterSpacing: 2 },
  button: { backgroundColor: Colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 8 },
  buttonDisabled: { opacity: 0.3 },
  buttonText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: Colors.onPrimary, letterSpacing: 1.5 },
  buttonDanger: { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.4)', paddingHorizontal: 16, paddingVertical: 8 },
  buttonDangerText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#FF6B6B', letterSpacing: 1.5 },
  addZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  zoneInput: {
    flex: 1,
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: Colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  aboutSection: { marginBottom: 40 },
  aboutBlock: { backgroundColor: '#1b1b1b' },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77, 71, 50, 0.15)',
  },
  aboutLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: Colors.outline, letterSpacing: 1.5 },
  aboutValue: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: Colors.onSurface, letterSpacing: 0.5 },
  sdgRow: { flexDirection: 'row', gap: 8 },
  sdgBadge: {
    flex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sdgNum: { fontFamily: 'SpaceMono_700Bold', fontSize: 18, color: Colors.primaryContainer, letterSpacing: -1 },
  sdgLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 7, color: Colors.outlineVariant, letterSpacing: 1.5, marginTop: 4 },
  footerDecoration: { marginTop: 64, alignItems: 'center', opacity: 0.2 },
  footerLine: { width: 1, height: 48, backgroundColor: Colors.primaryContainer, marginBottom: 16 },
  footerText: { fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 4, color: Colors.onSurface },
});
