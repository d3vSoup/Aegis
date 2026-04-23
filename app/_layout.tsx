import '../polyfill';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CustomTabBar } from '../components/BottomNavBar';
import { AlertProvider } from '../context/AlertContext';
import { useFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useEffect, useState } from 'react';
import { hasOnboarded } from '../services/StorageService';
import { router, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();


export default function Layout() {
  const [fontsLoaded, error] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Check onboarding status once fonts are loaded
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!fontsLoaded) return;

    async function checkOnboarding() {
      const onboarded = await hasOnboarded();
      setOnboardingChecked(true);
      if (!onboarded) {
        setNeedsOnboarding(true);
      }
    }
    checkOnboarding();
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && onboardingChecked) {
      SplashScreen.hideAsync();
      if (needsOnboarding) {
        // Push redirection to the next tick so the root layout can mount first
        setTimeout(() => {
          router.replace('/onboarding');
        }, 0);
      }
    }
  }, [fontsLoaded, onboardingChecked, needsOnboarding]);

  if (!fontsLoaded || !onboardingChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', marginTop: 50 }}>
          {!fontsLoaded ? 'Loading Fonts...' : 'Checking Onboarding...'}
        </Text>
      </View>
    );
  }

  return (
    <AlertProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="history" options={{ title: 'History' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
          <Tabs.Screen name="onboarding" options={{ href: null, title: 'Onboarding' }} />
        </Tabs>
      </View>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
