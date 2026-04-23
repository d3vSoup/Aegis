# 🛡️ Project Aegis: Comprehensive Context & Technical Roadmap
## Environmental Intelligence & Haptic Awareness Engine
**Codename**: Aura (Internal Package Name)  
**Vision Statement**: *"Silence is not an absence of noise, but a shield against it."*

---

## 1. Project Identity & Problem Statement

### The Gap
Individuals with hearing impairments or workers in high-decibel environments (construction, manufacturing, transit) suffer from a lack of **non-visual environmental awareness**. Traditional notification systems rely on active screen-viewing, which is impossible during focus-heavy tasks or while navigating urban streets.

### The Solution
**Aegis** is a sophisticated monitoring framework that synthesizes ambient acoustic signatures into tactile **haptic rhythms**. Unlike simple "noise meters," Aegis uses on-device Machine Learning to distinguish between harmless background noise and critical safety triggers, providing a "360-degree haptic sense."

---

## 2. Technical Stack (The "Sentinel" Stack)

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React Native 0.81.5 + Expo SDK ~54 | Cross-platform UI and native hardware bridge. |
| **Logic** | Expo Router | File-based navigation. (Note: Root `_layout` relies on async mounting vs direct `<Redirect>` loops). |
| **Inference** | TensorFlow Lite (TFLite) | On-device Neural Network processing (Near-zero latency). |
| **Animation** | React Native Reanimated (v4.1.1) | High-performance fluid UI. (Requires manual `runtimes.js` global patching and standalone babel plugin). |
| **Visuals** | React Native SVG | High-contrast iconography (Void Black & Solar Gold). |
| **Haptics** | `expo-haptics` | The tactile communication interface. |

### Package Initialization (Language: JavaScript)
The stack heavily relies on Expo's compilation matrix.
**Example Execution Block** (`babel.config.js`):
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required to compile Reanimated's highly-performant C++ worklet engine
      'react-native-reanimated/plugin',
    ],
  };
};
```
*What this does*: Ensures that any UI component utilizing Reanimated's `useSharedValue` or `useAnimatedStyle` is successfully transpiled to run on the separate UI thread rather than the main JS thread, preventing visual stutter.

---

## 3. Core Architecture: The Intelligence Layer

Aegis moves beyond simple decibel heuristics. It employs a **Deep Learning classification pipeline** running entirely on-device to ensure privacy and speed.

### 3.1 Acoustic Processing Pipeline
1. **Continuous Capture**: Uses `expo-av` to poll the microphone in small buffer chunks (e.g., 50ms).
2. **Transformation**: Audio signals are converted into **Mel-Spectrograms**—visual representations of frequency energy over time.
3. **AI Inference**: The spectrogram is fed into an optimized **TFLite model** (MobileNetV2 architecture) trained on the AudioSet dataset.
4. **Classification**: The model assigns a probability score to specific classes:
   * `Siren` (Emergency Vehicles)
   * `Horn` (Traffic Safety)
   * `Dog_Bark` (Domestic Awareness)
   * `Speech` (Name Detection/Urgent Calling)

### 3.2 On-Device Edge AI
* **No Cloud Latency**: Decisions are made in milliseconds directly on the hardware.
* **100% Privacy**: No audio data is ever uploaded or stored as a raw file; only classification results persist.

#### Edge Inference Pipeline (Language: TypeScript)
The audio extraction runs asynchronously, decoupled from global state to prevent memory leaks.
**Example Execution Block** (`services/AudioInference.ts`):
```typescript
export function startInference(onResult: InferenceCallback, sensitivity: number = 68): void {
  const sensitivityMultiplier = 1 - ((sensitivity - 50) / 100) * 0.3;

  inferenceTimer = setInterval(() => {
    const result = runMockInference();
    if (!result) return;

    // Calculate algorithmic confidence against user hardware boundaries
    const threshold = CONFIDENCE_THRESHOLDS[result.type] * sensitivityMultiplier;
    if (result.confidence < threshold) return;
    if (isDebounced(result.type)) return;

    markAlertFired(result.type);
    onResult(result); // Fire callback to the React Context
  }, INFERENCE_INTERVAL_MS);
}
```
*What this does*: Spins up an isolated background loop that polls the intelligence layer continuously. It intrinsically maps user sensitivity preferences against neural network confidence to reduce false-positive executions.

---

## 4. The Haptic Syntax Layer

The `HapticsEngine` translates AI classifications into a physical language. We move from "generic vibrations" to a structured tactile syntax.

| Sound Type | Pattern Name | Physical Algorithm | User Sensation |
| :--- | :--- | :--- | :--- |
| **Car Horn** | **Staccato** | `Impact.Heavy` (×3 Rapid) | A sharp, urgent jolt to the wrist. |
| **Emergency Siren** | **Siren** | `Notification.Warning` (Oscillating) | A rising and falling wave of pressure. |
| **Name Detection** | **Heartbeat** | `Impact.Medium` (Thump-Thump) | A familiar, personal "nudge" of awareness. |
| **Hazardous Decibels** | **Pressure** | `Selection` (Continuous Pulse) | A steady, rhythmic warning of volume. |

### Haptic Execution Architecture (Language: TypeScript)

The Haptics Engine is driven purely by **TypeScript** utilizing the `expo-haptics` bridge to interface with Native iOS Taptic Engines and Android vibrator motors. To prevent thread-blocking, complex rhythms are defined as strict generic arrays and streamed asynchronously utilizing micro-delays.

**Example Execution Block** (`utils/HapticsEngine.ts`):
```typescript
interface HapticStep {
  style: Haptics.ImpactFeedbackStyle;
  delay: number; // ms before this step fires
}

// 1. We map the English language patterns to exact hardware feedback loops
const PATTERNS: Record<HapticPattern, HapticStep[]> = {
  staccato: [
    // Sharp bursts — three rapid taps, pause, three more
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 0 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 80 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 80 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 300 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 80 },
    { style: Haptics.ImpactFeedbackStyle.Rigid, delay: 80 },
  ],
  // ...
};

// 2. The Play Loop executes the hardware instructions with precision timing
export function playPatternOnce(pattern: HapticPattern): void {
  const steps = PATTERNS[pattern];
  if (!steps) return;

  let accumulatedDelay = 0;
  steps.forEach((step) => {
    accumulatedDelay += step.delay;
    // Pushes the native call to the JS Event Loop based on accumulated time
    setTimeout(() => {
      Haptics.impactAsync(step.style).catch(() => {});
    }, accumulatedDelay);
  });
}
```
*What this does*: Instead of freezing the mobile interface using `await timeout()` loops, the engine calculates the future execution frame (`accumulatedDelay`) for every single haptic hit up front, firing them off into the event queue instantly. This allows the fluid React animations (the glowing shield ball) to execute simultaneously without dropping API frames.

---

## 5. UI/UX: The "Aegis Ball" & Visual Identity

### The Aegis Ball
The central component of the app is a **dynamic fluid orb** built with Reanimated. 
* **IDLE**: A slow, breathing pulse in **Solar Gold**.
* **ARMED**: The orb tightens and glows brighter, indicating the AI is listening.
* **ALERT**: The orb expands violently and shifts to a high-contrast state, synchronized perfectly with the Haptic Syntax.

#### Fluid Animation Architecture (Language: TypeScript)
The Aegis ball is physically built out of vector graphics (`react-native-svg`) bounded to C++ performance layers.
**Example Execution Block** (`components/AegisBall.tsx`):
```typescript
  const pulseScale = useSharedValue(1);

  // Switch statement mapping Redux-lite mode to animation state
  switch (mode) {
    case 'alert':
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 400, easing: Easing.out(Easing.exp) }),
          withTiming(0.92, { duration: 400, easing: Easing.in(Easing.exp) }),
        ),
        -1, // Loop infinitely until state change
        false
      );
      break;
  }

  // Connect the worklet directly to native layout execution
  const ballContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
```
*What this does*: Manipulates properties completely outside of React's standard state-tree via `useSharedValue`. By passing layout derivations into `useAnimatedStyle`, Reanimated communicates directly with the iOS/Android rendering core, bypassing JS memory bridging.

### Design Aesthetic
* **Background**: `Void Black` (#000000) for maximum OLED battery savings and focus.
* **Accents**: `Solar Gold` (#FFD700) and `Pure White` for clarity.

---

## 6. Implementation Roadmap

### Phase 1: The Foundation (Completed)
- [x] Define Medallion-inspired directory structure.
- [x] Set up `AlertContext` for global state management.
- [x] Implement the static `AegisBall` UI.

### Phase 2: The Intelligence (Active)
- [x] Architecture built for TFLite runtime in `AudioInference.ts` (currently stubbed).
- [x] Calibrate confidence thresholds via `AcousticTiers.ts`.
- [ ] Wire raw Native Audio Bridge (Oboe/CoreAudio) directly into TFLite.

### Phase 3: The Awareness (Completed/Future)
- [x] **Acoustic History**: A persistence layer using `AsyncStorage` to track daily threat spikes across sessions.
- [x] **User Onboarding**: 3-slide haptic demo carousel educating the user on the haptic syntax.
- [x] **Investor Demo Mode**: Hidden simulation feature on the AegisBall.
- [ ] **Custom Name Trigger**: Allow users to train a 1-second vocal sample of their name for personalized alerts.

#### Persistence Layer Architecture (Language: TypeScript)
**Example Execution Block** (`services/StorageService.ts`):
```typescript
export async function loadHistory(): Promise<AlertEvent[]> {
  try {
    const raw = await AsyncStorage.getItem('aegis_alert_history');
    if (!raw) return [];
    
    // Explicit typescript casting from JSON boundary
    const parsed = JSON.parse(raw) as Array<AlertEvent & { timestamp: string }>;
    
    // Re-hydrate strictly-typed Date objects for UI usage
    return parsed.map((event) => ({
      ...event,
      timestamp: new Date(event.timestamp),
    }));
  } catch (e) {
    return [];
  }
}
```
*What this does*: Binds JSON strings sitting on the actual Native iOS/Android hard disk into structured TypeScript interfaces securely.

---

## 7. SDG Alignment (United Nations)
Project Aegis is built with global social impact at its core:
* **SDG 3 (Health & Well-being)**: Protecting auditory health.
* **SDG 10 (Reduced Inequalities)**: Empowering the deaf and hard-of-hearing community through technology.
* **SDG 11 (Sustainable Cities)**: Increasing safety in dense urban environments.

---

## 8. State Management Architecture

Aegis uses a centralized, singleton-style context pattern (`AlertContext.tsx`) designed to mirror a Redux-like global store but without the boilerplate overhead. This architecture guarantees the UI visually syncs with the background hardware logic instantly:

1. **The Provider Layer**: Wraps the root `<Tabs>` in `_layout.tsx`.
2. **Hydration Engine**: On boot, Context silently loads historical events and user preferences from native device storage (`AsyncStorage`).
3. **Core State Trackers**:
   - `safetyMode`: A global boolean bound to the `AegisBall` state. Determines if the underlying audio interface should be actively evaluating buffers.
   - `alertHistory`: A serializable array of logged threat signatures across all sessions.
   - `eventPatternMap`: A mapping dictionary linking specific AI classifications (e.g., 'horn', 'dog') directly to their assigned physical haptic syntax.
4. **Action Dispatchers**: Methods like `triggerAlert(type, db)` manipulate state and physically drive the hardware (via `expo-haptics`) in a single synchronous cycle.

#### Global Context Bridging (Language: TypeScript)
**Example Execution Block** (`context/AlertContext.tsx`):
```typescript
  useEffect(() => {
    if (state.safetyMode) {
      startInference((result) => {
        // Hydrate an alert object based on intelligence callback
        const event = createMockAlert(result.type, state.eventPatternMap, state.userName);
        dispatch({ type: 'TRIGGER_ALERT', payload: event });
      }, state.sensitivity);
    } else {
      stopInference();
    }
    // Cleanup to prevent memory bleed on unmount
    return () => stopInference();
  }, [state.safetyMode]);
```
*What this does*: Listens globally for the `safetyMode` toggle. The millisecond the user activates the system, it spins up the Edge AI polling engine. Any result piped out of it is instantly `dispatched` up into the reducer, making it visible to history, haptics, and the home screen simultaneously.

---

## 9. Comprehensive Page Workflows

### `/app/_layout.tsx` (The Sentinel Core)
**Workflow**: Acts as the unyielding guardian of app initialization.
1. Mounts global `expo-google-fonts`.
2. Executes strict device storage lookups to check if `safetyMode` is established.
3. Decides execution path: If this is a first-time user, an async effect explicitly breaks them out of the tab environment and forces them sequentially into `/onboarding` mode.
4. If validated, paints the core Navigation `<Tabs>` container and the persistent `CustomTabBar`.

#### Root Protection Logic (Language: TypeScript)
**Example Execution Block**:
```typescript
  useEffect(() => {
    if (fontsLoaded && onboardingChecked) {
      SplashScreen.hideAsync();
      if (needsOnboarding) {
        // Push redirection to the next tick so the root layout can mount first
        setTimeout(() => router.replace('/onboarding'), 0);
      }
    }
  }, [fontsLoaded, onboardingChecked, needsOnboarding]);
```
*What this does*: Ensures the Expo layout container resolves completely before forcing a navigation overwrite, preventing `Route Failed` infinite loops from catastrophic unmounts.

### `/app/index.tsx` (The Radar)
**Workflow**: The central command deck minimizing cognitive load.
1. Dominates the screen with the `AegisBall`—a massive fluid Reanimated engine bound to `safetyMode`.
2. Tapping the main toggle dynamically updates context, driving the orb from its low-power `idle` (breathing) state to a tense `armed` (listening) state.
3. Contains the hidden "Investor Simulation": A triple-tap on the orb triggers the context API to fabricate a random severe acoustic threat (Siren/Horn), demonstrating the haptic response and visual shift instantly without acoustic input.

### `/app/onboarding.tsx` (The Training Ground)
**Workflow**: Educates the tactile language.
1. Utilizes a horizontal, non-scrollable `react-native` FlatList/ScrollView driven by managed dot indicators.
2. Breaks down the philosophy across three stages.
3. Stage 2 explicitly provides physical hardware buttons to fire "Staccato", "Siren", and "Heartbeat" rhythms so the user's nervous system is primed before real-world usage.
4. Concludes by flagging `AsyncStorage` and bouncing the user into the Home Radar.

### `/app/history.tsx` (The Black Box Logs)
**Workflow**: The silent witness to the environment.
1. Subscribes heavily to `alertHistory` coming live from Context.
2. Derives heavy computational metrics via `useMemo`: Calculates peak daily DB, visualizes event frequency, and groups items categorically by calendar day.
3. Maps discrete events to threat severity (Warning vs Critical) and applies the corresponding visual `AcousticTiers` styling (Gold vs Red) and dynamic proximity charts.

#### Memoized Big-Data Transformation (Language: TypeScript)
**Example Execution Block**:
```typescript
  const stats = useMemo(() => {
    if (alertHistory.length === 0) return null;
    const peakDb = Math.max(...alertHistory.map((e) => e.decibels));
    // Extracts statistical frequency
    const counts: Record<AlertEventType, number> = { horn: 0, dog: 0, siren: 0, name_detected: 0 };
    alertHistory.forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1; });
    
    return { peakDb, total: alertHistory.length };
  }, [alertHistory]);
```
*What this does*: Restricts complex sorting and reducing operations from blocking the UI thread. The system will ONLY recompute the math if `alertHistory` physically updates, preventing array iterations on every re-render.

### `/app/settings.tsx` (The Matrix Control Room)
**Workflow**: Complete parameter oversight.
1. Modifies the primary `Context` preferences through isolated blocks.
2. **Name Mapping**: A specialized text input allowing a custom vocabulary string that the TFLite Voice recognition pipeline favors.
3. **Hardware Thresholds**: Direct sliding manipulation of the underlying Native Layer Sensitivity (-60dB to Peak). 
4. **Data Destruction**: A dedicated caching management zone triggering full device sweeps (`clearHistory` & `resetAll`), ensuring maximum local privacy is permanently respected.

#### Global Mutable Hook Implementation (Language: TypeScript)
**Example Execution Block**:
```typescript
export default function Settings() {
  const { sensitivity, setSensitivity, clearHistory } = useAlert();

  const handleCachePurge = () => {
    Alert.alert('Purge All History', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PURGE', style: 'destructive', onPress: () => clearHistory() },
    ]);
  };
}
```
*What this does*: Directly extracts mutate functions from the Context hook, linking iOS/Android native `Alert` dialogs to instant Global State wiping operations securely.

---

## 10. Directory Structure
```text
📂 Aegis
├── 📂 app/             # Application Screens (index.tsx, history.tsx)
├── 📂 components/      # AegisBall.tsx, HapticFeedbackController.tsx
├── 📂 context/         # AlertContext.tsx (The Sentinel state logic)
├── 📂 services/        # AudioInference.ts (TFLite Logic), HapticSyntax.ts
├── 📂 assets/          # ML Models (.tflite), SVG Iconography
├── 📂 constants/       # Theme.ts, AcousticTiers.ts
└── 📄 context.md       # Master Reference Document
```
