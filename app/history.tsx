import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { TopAppBar } from '../components/TopAppBar';
import { useAlert } from '../context/AlertContext';
import type { AlertEvent } from '../context/AlertContext';
import {
  formatTimestamp,
  getAlertSeverity,
  getAlertCategory,
  getAlertDescription,
} from '../utils/AlertManager';
import { getDbTier, getDbTierColor } from '../constants/AcousticTiers';
import type { AlertEventType } from '../context/AlertContext';

// ─── Date Label Helper ────────────────────────────────────────────────
function formatDateGroup(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'TODAY';
  if (isSameDay(date, yesterday)) return 'YESTERDAY';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

export default function History() {
  const { alertHistory, clearHistory, safetyMode, isHydrated } = useAlert();

  // ─── Stats derived from history ───────────────────────────────────
  const stats = useMemo(() => {
    if (alertHistory.length === 0) return null;
    const peakDb = Math.max(...alertHistory.map((e) => e.decibels));
    const counts: Record<AlertEventType, number> = { horn: 0, dog: 0, siren: 0, name_detected: 0 };
    alertHistory.forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1; });
    const topType = (Object.entries(counts) as [AlertEventType, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    const todayCount = alertHistory.filter((e) => {
      const today = new Date();
      const d = new Date(e.timestamp);
      return d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    }).length;
    return { peakDb, topType, todayCount, total: alertHistory.length };
  }, [alertHistory]);

  // ─── Group events by date ─────────────────────────────────────────
  const groupedEvents = useMemo(() => {
    const groups: { label: string; events: AlertEvent[] }[] = [];
    const map = new Map<string, AlertEvent[]>();

    alertHistory.forEach((event) => {
      const key = formatDateGroup(new Date(event.timestamp));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    });

    map.forEach((events, label) => { groups.push({ label, events }); });
    return groups;
  }, [alertHistory]);

  // ─── Render Alert Card ────────────────────────────────────────────
  const renderCard = (event: AlertEvent, index: number) => {
    const severity = getAlertSeverity(event.type);
    const category = getAlertCategory(event.type);
    const description = getAlertDescription(event);
    const tier = getDbTier(event.decibels);
    const tierColor = getDbTierColor(tier);

    const isCritical = severity === 'critical';
    const isWarning = severity === 'warning';

    return (
      <View
        key={event.id}
        style={[styles.card, isCritical && styles.cardCritical]}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[
              styles.entryTag,
              isCritical && styles.entryTagCritical,
              isWarning && styles.entryTagWarning,
            ]}>
              {String(index + 1).padStart(2, '0')} // {category}
            </Text>
            <Text style={styles.entryTitle}>{event.label}</Text>
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.entryTime}>{formatTimestamp(event.timestamp)}</Text>
            <View style={styles.metricRow}>
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
              <Text style={[styles.metricValue, { color: tierColor }]}>
                {event.decibels} DB
              </Text>
            </View>
            <Text style={[styles.tierLabel, { color: tierColor }]}>{tier}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        </View>

        {/* DB bar */}
        <View style={styles.graphRow}>
          {[1, 0.7, 0.4, 0.6].map((factor, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.max(8, (event.decibels * factor / 110) * 48),
                  opacity: isCritical ? 0.8 * factor : 0.4 * factor,
                  backgroundColor: isCritical ? Colors.error : Colors.primaryContainer,
                },
              ]}
            />
          ))}
        </View>

        {event.proximity && (
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>PROXIMITY: {event.proximity}</Text>
            <Text style={styles.footerLabel}>PATTERN: {event.hapticPattern.toUpperCase()}</Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Statistics Header ────────────────────────────────────────────
  const renderStats = () => {
    if (!stats) return null;
    const tierColor = getDbTierColor(getDbTier(stats.peakDb));
    const typeLabels: Record<AlertEventType, string> = {
      siren: 'SIREN', horn: 'HORN', dog: 'DOG', name_detected: 'NAME',
    };
    return (
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{stats.todayCount}</Text>
          <Text style={styles.statLabel}>TODAY</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: tierColor }]}>{stats.peakDb}</Text>
          <Text style={styles.statLabel}>PEAK DB</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{typeLabels[stats.topType]}</Text>
          <Text style={styles.statLabel}>MOST COMMON</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>LIFETIME</Text>
        </View>
      </View>
    );
  };

  // ─── Empty State ──────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyGlow} />
      <Text style={styles.emptyIcon}>◎</Text>
      <Text style={styles.emptyTitle}>No Events Logged</Text>
      <Text style={styles.emptyDesc}>
        {!isHydrated
          ? 'Loading persisted history...'
          : safetyMode
          ? 'Your sentinel is armed and listening. Events will appear here when detected.'
          : 'Enable Safety Mode on the Home screen to begin environmental monitoring.'}
      </Text>
      <View style={styles.emptyDots}>
        <View style={styles.emptyDot} />
        <View style={styles.emptyDot} />
        <View style={styles.emptyDot} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopAppBar title="Aegis" subtitle={safetyMode ? 'ACTIVE' : 'STANDBY'} battery="🔋" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Editorial Header */}
        <View style={styles.headerArea}>
          <View style={styles.headerLeftLine} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Log of acoustic signatures detected by the sentinel</Text>
          </View>
        </View>

        {/* Stats Header */}
        {stats && renderStats()}

        {/* Event Count Row */}
        {alertHistory.length > 0 && (
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {alertHistory.length} EVENT{alertHistory.length !== 1 ? 'S' : ''}
              </Text>
            </View>
            <View style={styles.rightBadges}>
              {isHydrated && (
                <View style={styles.persistedBadge}>
                  <View style={styles.persistedDot} />
                  <Text style={styles.persistedText}>PERSISTED</Text>
                </View>
              )}
              <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
                <Text style={styles.clearText}>CLEAR ALL</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Event Cards grouped by date */}
        {alertHistory.length === 0
          ? renderEmptyState()
          : groupedEvents.map(({ label, events }) => (
            <View key={label}>
              <View style={styles.dateGroupRow}>
                <View style={styles.dateGroupLine} />
                <Text style={styles.dateGroupLabel}>{label}</Text>
                <View style={styles.dateGroupLine} />
              </View>
              {events.map((event, index) => renderCard(event, index))}
            </View>
          ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* System Status Toast */}
      <View style={styles.toastContainer}>
        <View style={styles.toastLeft}>
          <Text style={styles.toastIcon}>📡</Text>
          <Text style={styles.toastText}>SENTINEL {safetyMode ? 'ACTIVE' : 'OFFLINE'}</Text>
        </View>
        <Text style={styles.toastUptime}>{alertHistory.length} LOGGED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },

  headerArea: { flexDirection: 'row', marginBottom: 24 },
  headerLeftLine: { width: 2, backgroundColor: Colors.primaryContainer, marginRight: 16 },
  title: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 48,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },

  // ─── Stats Row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    marginBottom: 20,
  },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 18,
    color: Colors.primaryContainer,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    color: Colors.outline,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  statDivider: { width: 1, backgroundColor: 'rgba(77, 71, 50, 0.3)', marginVertical: 12 },

  // ─── Count Row ────────────────────────────────────────────────────
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  countBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  countText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: Colors.primaryContainer, letterSpacing: 2 },
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  persistedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  persistedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4CAF50' },
  persistedText: { fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: '#4CAF50', letterSpacing: 1.5 },
  clearButton: { paddingHorizontal: 12, paddingVertical: 4 },
  clearText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: Colors.onSurfaceVariant, letterSpacing: 2 },

  // ─── Date Groups ──────────────────────────────────────────────────
  dateGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  dateGroupLine: { flex: 1, height: 1, backgroundColor: 'rgba(77, 71, 50, 0.15)' },
  dateGroupLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: Colors.outlineVariant,
    letterSpacing: 2,
  },

  // ─── Event Cards ──────────────────────────────────────────────────
  card: { backgroundColor: '#1b1b1b', padding: 24, marginBottom: 16 },
  cardCritical: {
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderLeftWidth: 2,
    borderLeftColor: Colors.error,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  entryTag: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: Colors.outline,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  entryTagCritical: { color: Colors.error },
  entryTagWarning: { color: Colors.primaryContainer },
  entryTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: Colors.onSurface },
  alignRight: { alignItems: 'flex-end' },
  entryTime: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: Colors.onSurfaceVariant },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 },
  tierDot: { width: 5, height: 5, borderRadius: 3 },
  metricValue: { fontFamily: 'SpaceMono_400Regular', fontSize: 10 },
  tierLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 1.5, marginTop: 3 },
  cardBody: { marginBottom: 12 },
  descriptionBlock: { borderTopWidth: 1, borderTopColor: 'rgba(77, 71, 50, 0.15)', paddingTop: 12 },
  descriptionText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 18 },
  graphRow: { flexDirection: 'row', height: 48, gap: 8, alignItems: 'flex-end', marginTop: 8 },
  bar: { flex: 1, backgroundColor: Colors.primaryContainer },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  footerLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: Colors.outline, letterSpacing: 1 },

  // ─── Empty State ──────────────────────────────────────────────────
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyGlow: {
    position: 'absolute',
    top: 60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  emptyIcon: { fontSize: 48, color: Colors.outlineVariant, marginBottom: 24 },
  emptyTitle: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 28,
    color: Colors.onSurfaceVariant,
    marginBottom: 12,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  emptyDots: { flexDirection: 'row', gap: 8 },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.outlineVariant },

  // ─── Toast ────────────────────────────────────────────────────────
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: '85%',
    backgroundColor: 'rgba(57, 57, 57, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    zIndex: 50,
  },
  toastLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 14, color: Colors.primaryContainer },
  toastText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#ffffff', letterSpacing: 1.5 },
  toastUptime: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: 'rgba(226, 226, 226, 0.6)' },
});
