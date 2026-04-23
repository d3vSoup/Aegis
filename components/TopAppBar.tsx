import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { AegisLogo } from './AegisLogo';

interface TopAppBarProps {
  title?: string;
  subtitle?: string;
  battery?: string;
}

export function TopAppBar({ title = "Aegis", subtitle = "ACTIVE", battery = "🔋" }: TopAppBarProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.left}>
         <AegisLogo size={20} color="#FFD700" />
         
         {/* Masked Gradient Text */}
         <MaskedView
           style={styles.maskedContainer}
           maskElement={
             <View style={styles.maskWrapper}>
               <Text style={styles.titleMask}>{title}</Text>
             </View>
           }
         >
           <LinearGradient
             colors={['#FFD700', '#F9E076']}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 1 }} // roughly 45 degrees
             style={styles.gradientFill}
           />
         </MaskedView>
      </View>
      
      <View style={styles.right}>
         {/* System Status in Space Mono Bold All Caps */}
         <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>
         <Text style={styles.icon}>{battery}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000', // Void Black as requested
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 64 + 40, 
    zIndex: 50,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  maskedContainer: {
    height: 30, // Must explicitly size the container for MaskedView
    width: 100,
  },
  maskWrapper: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  titleMask: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 24,
    color: 'black', // Text color inside mask must be solid black for the alpha channel map
    letterSpacing: -0.5,
  },
  gradientFill: {
    flex: 1, // Fills the size of the masked container
  },
  subtitle: {
    fontFamily: 'SpaceMono_700Bold', // Ensuring it's Space Mono, Bold, All Caps as per design doc
    fontSize: 10,
    letterSpacing: 2,
    color: '#FFC107', // Luminous Amber for active states, or adapt dynamically later
  },
  icon: {
    color: Colors.primaryContainer,
    fontSize: 14,
  }
});
