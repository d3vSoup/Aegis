# 🐛 Aegis Debug History & Resolution Log

This document tracks complex initialization and runtime bugs resolved during development to serve as a reference for future package upgrades.

---

## 1. Reanimated 4 Logger Global Crash
**Symptom**: Uncaught `ReferenceError: Property '__reanimatedLoggerConfig' doesn't exist`. The app crashed completely on load in Expo Go.
**Root Cause**: 
1. React Native Reanimated v4.1.1 has a typo in its core lib: `node_modules/react-native-reanimated/lib/module/runtimes.js`. It accesses an implicit `__reanimatedLoggerConfig` without safely prefixing it with the `global.` object.
2. In strict mode, an implicitly missing global variable throws a `ReferenceError` instantly.
**Resolution**:
- Manually patched `node_modules/react-native-reanimated/lib/module/runtimes.js` to read `const config = global.__reanimatedLoggerConfig;`.
- Set up `polyfill.ts` as the absolute first import in `app/_layout.tsx` to pre-seed the logger config.
- *Status: SOLVED (Required package patch).*

## 2. Duplicate Babel Plugins Error
**Symptom**: Red screen error stating `Duplicate plugin/preset detected` between `react-native-worklets` and `react-native-reanimated`.
**Root Cause**:
- Reanimated 4 internally bundles the worklets engine. Defining both `react-native-worklets/plugin` and `react-native-reanimated/plugin` inside `babel.config.js` causes Babel to register the exact same transform twice.
**Resolution**:
- Cleaned `babel.config.js` to rely exclusively on:
  ```javascript
  plugins: [ 'react-native-reanimated/plugin' ]
  ```
- *Status: SOLVED.*

## 3. Expo Router Infinite Redirect Loop (Black/White Flashing Screen)
**Symptom**: App flashed between black and white rapidly, getting stuck, logging that route default exports were missing or hanging.
**Root Cause**:
- In `app/_layout.tsx`, the root layout was returning a direct `<Redirect href="/onboarding" />` component instead of allowing the core navigation structure (`<Tabs>`) to render. 
- Expo Router immediately unmounted the layout array to process the redirect, rebuilt it locally, immediately hit the block again, and infinitely looped.
**Resolution**:
- Ripped out the root layout `<Redirect>` block.
- Delegated the redirection to an asynchronous timeout inside the main `useEffect()` hook using `router.replace('/onboarding')`. This ensures the core UI graph mounts safely before substituting the internal route view.
- Added explicit visual fallback text (`Loading Fonts...` / `Checking Onboarding...`) to catch hanging promises dynamically rather than silently failing to `null`.
- *Status: SOLVED.*
