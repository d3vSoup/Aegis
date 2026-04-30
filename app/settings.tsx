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

const ALL_PATTERNS: HapticPattern[] = ['staccato', 'siren', 'heartbeat'];

const EVENT_LABELS: Record<keyof EventPatternMap, { label: string; icon: string }> = {
  horn: { label: 'Car Horn', icon: '🚗' },
  dog: { label: 'Dog Bark', icon: '🐕' },
  siren: { label: 'Emergency Siren', icon: '🚨' },
  name: { label: 'Name Detected', icon: '🗣️' },
};

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
    hapticIntensity,
    setHapticIntensity,
    userName,
    setUserName,
    eventPatternMap,
    setEventPattern,
    alertHistory,
    clearHistory,
    safeZones,
    addSafeZone,
    removeSafeZone,
  } = useAlert();

  const [nameInput, setNameInput] = useState(userName);
  const [zoneNameInput, setZoneNameInput] = useState('');
  const [wearableStatus, setWearableStatus] = useState<WearableStatus>(getWearableStatus);
  const [customPatternUrl, setCustomPatternUrl] = useState('');

  useEffect(() => {
    onStatusChange((status) => setWearableStatus(status));
  }, []);

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

  const handleNameSubmit = () => {
    setUserName(nameInput.trim());
    playSelectionTick();
  };

  const dbValue = (-60 + (sensitivity / 100) * 50).toFixed(1);

  return (
    <View style={styles.container}>
      <TopAppBar subtitle="CONFIGURATION" battery="🔋" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerArea}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>System Configuration & Haptics</Text>
        </View>

        {/* ─── User Name ─── */}
        <View style={styles.card}>
          <View style={styles.cardAccentLine} />
          <Text style={styles.sectionLabel}>SOUND CATCHER — USER NAME</Text>
          <Text style={styles.sectionDesc}>
            The sentinel alerts you when this name is spoken.
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
              <TouchableOpacity style={styles.button} onPress={handleNameSubmit}>
                <Text style={styles.buttonText}>SAVE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Haptic Intensity (NEW) ─── */}
        <View style={styles.card}>
          <View style={styles.cardAccentLine} />
          <View style={styles.sensHeader}>
            <View>
              <Text style={styles.sectionLabel}>HAPTIC INTENSITY</Text>
              <Text style={styles.sectionDesc}>Adjust the physical force of vibrations.</Text>
            </View>
            <Text style={styles.sensValue}>{hapticIntensity}%</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Pressable
              style={styles.sliderTouchArea}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const pct = Math.max(0, Math.min(100, (locationX / 280) * 100));
                setHapticIntensity(Math.round(pct));
                playSelectionTick();
              }}
            >
              <View style={styles.sliderTrack} />
              <View style={[styles.sliderFill, { width: `${hapticIntensity}%` }]} />
              <View style={[styles.sliderThumb, { left: `${hapticIntensity}%` }]} />
            </Pressable>
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>LIGHT</Text>
            <Text style={styles.sliderLabelText}>RIGID</Text>
          </View>
        </View>

        {/* ─── Native Layer Sensitivity ─── */}
        <View style={styles.card}>
          <View style={styles.cardAccentLine} />
          <View style={styles.sensHeader}>
            <View>
              <Text style={styles.sectionLabel}>MICROPHONE SENSITIVITY</Text>
              <Text style={styles.sectionDesc}>Adjust acoustic detection threshold.</Text>
            </View>
            <Text style={styles.sensValue}>{dbValue} dB</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Pressable
              style={styles.sliderTouchArea}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const pct = Math.max(0, Math.min(100, (locationX / 280) * 100));
                setSensitivity(Math.round(pct));
                playSelectionTick();
              }}
            >
              <View style={styles.sliderTrack} />
              <View style={[styles.sliderFill, { width: `${sensitivity}%` }]} />
              <View style={[styles.sliderThumb, { left: `${sensitivity}%` }]} />
            </Pressable>
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>MIN</Text>
            <Text style={styles.sliderLabelText}>MAX</Text>
          </View>
        </View>

        {/* ─── Event Mapping ─── */}
        <Text style={styles.sectionTitle}>EVENT MAPPING</Text>
        <View style={styles.eventMapSection}>
          {(Object.keys(EVENT_LABELS) as Array<keyof EventPatternMap>).map((event) => {
            const { label, icon } = EVENT_LABELS[event];
            const assignedPattern = eventPatternMap[event];
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
                        {getPatternIcon(assignedPattern)} {getPatternDisplayName(assignedPattern).toUpperCase()} ↻
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.buttonOutline}
                  onPress={() => playPatternOnce(assignedPattern)}
                >
                  <Text style={styles.buttonOutlineText}>TEST</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ─── Custom Pattern ─── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CUSTOM PATTERN URL</Text>
          <Text style={styles.sectionDesc}>Load a custom JSON vibration sequence.</Text>
          <View style={styles.nameInputRow}>
            <TextInput
              style={styles.nameInput}
              value={customPatternUrl}
              onChangeText={setCustomPatternUrl}
              placeholder="https://example.com/pattern.json"
              placeholderTextColor="rgba(208, 198, 171, 0.3)"
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity 
              style={[styles.button, !customPatternUrl && styles.buttonDisabled]} 
              disabled={!customPatternUrl}
            >
              <Text style={styles.buttonText}>LOAD</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 },
  headerArea: { marginBottom: 30 },
  title: { fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 48, color: '#FFD700', letterSpacing: -1 },
  subtitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: 'rgba(208, 198, 171, 0.6)', letterSpacing: 2, marginTop: 4 },
  
  card: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    overflow: 'hidden',
  },
  cardAccentLine: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    backgroundColor: '#FFD700',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  sectionLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, color: '#FFD700', letterSpacing: 1.5, marginBottom: 6 },
  sectionDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(208, 198, 171, 0.6)', marginBottom: 16 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10, color: 'rgba(208, 198, 171, 0.5)', letterSpacing: 3, marginBottom: 12, marginTop: 10 },
  
  nameInputRow: { flexDirection: 'row', gap: 12 },
  nameInput: { flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 14, color: '#FFD700', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 215, 0, 0.3)', paddingVertical: 8 },
  
  sensHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sensValue: { fontFamily: 'SpaceMono_400Regular', fontSize: 18, color: '#FFD700' },
  
  sliderContainer: { height: 30, justifyContent: 'center' },
  sliderTouchArea: { width: '100%', height: 30, justifyContent: 'center' },
  sliderTrack: { width: '100%', height: 4, backgroundColor: '#222', borderRadius: 2 },
  sliderFill: { position: 'absolute', height: 4, backgroundColor: '#FFD700', borderRadius: 2 },
  sliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFD700', top: 7, marginLeft: -8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderLabelText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: 'rgba(208, 198, 171, 0.4)' },
  
  eventMapSection: { gap: 12, marginBottom: 30 },
  eventRow: { backgroundColor: '#181818', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
  eventRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  eventIconBg: { width: 40, height: 40, backgroundColor: 'rgba(255, 215, 0, 0.08)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  eventIcon: { fontSize: 18 },
  eventName: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: '#FFF', letterSpacing: 1, marginBottom: 4 },
  eventPattern: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#FFD700' },
  
  button: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.3 },
  buttonText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#000', letterSpacing: 1.5 },
  buttonOutline: { borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buttonOutlineText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#FFD700', letterSpacing: 1.5 },
});
