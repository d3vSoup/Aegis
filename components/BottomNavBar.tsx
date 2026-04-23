import { Tabs } from 'expo-router';
import { Colors } from '../constants/Colors';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 20 }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

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

        const iconMap: Record<string, string> = {
          index: "◎",
          history: "▤",
          settings: "⚙"
        };
        const icon = iconMap[route.name] || "•";

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Text style={[styles.icon, isFocused ? styles.iconActive : styles.iconInactive]}>
              {icon}
            </Text>
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
              {label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0e0e0e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(77, 71, 50, 0.15)', // outline-variant with opacity
    height: 80,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    letterSpacing: 2,
  },
  iconActive: {
    color: Colors.primaryContainer,
  },
  iconInactive: {
    color: Colors.surfaceContainerHighest,
  },
  labelActive: {
    color: Colors.primaryContainer,
  },
  labelInactive: {
    color: Colors.surfaceContainerHighest,
  }
});

export { CustomTabBar };
