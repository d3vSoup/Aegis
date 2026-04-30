import React, { useRef } from 'react';
import { Colors } from '../constants/Colors';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_CONFIG: Record<string, { icon: string; label: string }> = {
  index:      { icon: '◎', label: 'HOME' },
  history:    { icon: '▤', label: 'HISTORY' },
  settings:   { icon: '⚙', label: 'CONFIG' },
  onboarding: { icon: 'ℹ', label: 'ABOUT' },
};

function TabItem({
  route,
  isFocused,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = TAB_CONFIG[route.name] ?? { icon: '•', label: route.name.toUpperCase() };

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
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
      <Animated.View
        style={[
          styles.tabPill,
          isFocused && styles.tabPillActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={[styles.icon, isFocused ? styles.iconActive : styles.iconInactive]}>
          {config.icon}
        </Text>
        <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
          {config.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 16 }]}>
      <View style={styles.innerBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.12)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
  },
  innerBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    gap: 3,
  },
  tabPillActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    fontSize: 18,
    marginBottom: 2,
  },
  label: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 8,
    letterSpacing: 1.5,
  },
  iconActive:    { color: '#FFD700' },
  iconInactive:  { color: 'rgba(208, 198, 171, 0.55)' },
  labelActive:   { color: '#FFD700' },
  labelInactive: { color: 'rgba(208, 198, 171, 0.45)' },
});
