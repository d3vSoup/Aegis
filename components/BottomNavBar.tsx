// ─── BottomNavBar.tsx ─────────────────────────────────────────────────
// Clean floating pill nav bar. Pure SVG icons — no emoji, no text logos.
// All 4 tabs in a single horizontal row. Active tab: golden + glow dot.
// ─────────────────────────────────────────────────────────────────────

import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── SVG Icons ───────────────────────────────────────────────────────

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L4 6v6c0 5.5 3.75 10.74 8 12 4.25-1.26 8-6.5 8-12V6L12 2z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

function SlidersIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6h16" />
      <Path d="M4 12h16" />
      <Path d="M4 18h16" />
      <Circle cx="9" cy="6"  r="2" fill={color} stroke="none" />
      <Circle cx="15" cy="12" r="2" fill={color} stroke="none" />
      <Circle cx="9" cy="18" r="2" fill={color} stroke="none" />
    </Svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8h.01" />
      <Path d="M12 12v4" />
    </Svg>
  );
}

// ─── Tab config ──────────────────────────────────────────────────────

const TABS: Record<string, { label: string; Icon: React.FC<{ color: string }> }> = {
  index:      { label: 'Home',    Icon: ShieldIcon  },
  history:    { label: 'History', Icon: ClockIcon   },
  settings:   { label: 'Config',  Icon: SlidersIcon },
  onboarding: { label: 'About',   Icon: InfoIcon    },
};

const GOLD   = '#FFD700';
const MUTED  = 'rgba(255,255,255,0.28)';

// ─── TabItem ─────────────────────────────────────────────────────────

function TabItem({ route, isFocused, onPress }: {
  route: any; isFocused: boolean; onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tab = TABS[route.name] ?? { label: route.name, Icon: InfoIcon };
  const color = isFocused ? GOLD : MUTED;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.84, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={1}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
          <tab.Icon color={color} />
        </View>
        <Text style={[styles.tabLabel, { color }]}>
          {tab.label}
        </Text>
        {isFocused && <View style={styles.activeDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── CustomTabBar ─────────────────────────────────────────────────────

export function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress', target: route.key, canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <TabItem key={route.key} route={route} isFocused={isFocused} onPress={onPress} />
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,10,10,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
    borderRadius: 26,
    marginHorizontal: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  tabLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    letterSpacing: 0.8,
  },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 1,
  },
});
