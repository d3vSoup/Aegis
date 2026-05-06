# 🛡️ Project Aegis: Comprehensive Context & Technical Roadmap
## Environmental Intelligence & Haptic Awareness Engine
**Codename**: Aura (Internal Package Name)  
**Vision Statement**: *"Silence is not an absence of noise, but a shield against it."*

---

## 1. Project Identity & Problem Statement

### The Gap
Individuals with hearing impairments or workers in high-decibel environments (construction, manufacturing, transit) suffer from a lack of **non-visual environmental awareness**. Traditional notification systems rely on active screen-viewing, which is impossible during focus-heavy tasks or while navigating urban streets.

### The Solution
**Aegis** is a sophisticated monitoring framework that synthesizes ambient acoustic signatures into tactile **haptic rhythms**. Unlike simple "noise meters," Aegis uses on-device Machine Learning (and heuristic modeling) to distinguish between harmless background noise and critical safety triggers, providing a "360-degree haptic sense."

---

## 2. Technical Stack (The "Sentinel" Stack)

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React Native 0.81.5 + Expo SDK ~54 | Cross-platform UI and native hardware bridge. |
| **Logic** | Expo Router | File-based navigation. (Note: Root `_layout` relies on async mounting vs direct `<Redirect>` loops). |
| **Inference** | Heuristic dB / TensorFlow Lite | Real-time audio classification pipeline. |
| **Animation** | React Native Reanimated (v4.1.1) | High-performance fluid UI. (Runs on UI thread). |
| **Visuals** | React Native SVG | High-contrast iconography (Void Black & Solar Gold). |
| **Haptics** | `expo-haptics` | The tactile communication interface. |

---

## 3. Core Architecture: The Intelligence Layer

Aegis uses a continuous audio processing pipeline. To bypass the need for a complex native Custom Dev Client initially, we developed a highly robust **Heuristic Audio Classifier** using `expo-av` that maps directly to real-world decibel logic.

### 3.1 Live Audio Capture Pipeline (Expo Go Compatible)
Instead of recording long audio files to disk (which causes storage degradation and latency), Aegis captures **micro-buffers** (1-second chunks) in RAM using `expo-av`'s `Audio.Recording`.

1. **Continuous Capture**: The mic is locked in recording mode and records 1-second chunks in an infinite loop.
2. **Metering Extraction**: Every 200ms, the engine polls the raw hardware metering status (dBFS) and converts it to approximate Sound Pressure Level (SPL) by adding a standard +94 dB offset.
3. **Classification**: The decibel energy is evaluated against sensitivity-adjusted thresholds:
   * `> 72 dB` → **Siren** (Emergency Vehicles, highly continuous noise)
   * `> 62 dB` → **Horn** (Traffic Safety, loud sudden bursts like claps)
   * `> 50 dB` → **Dog_Bark** (Domestic Awareness)
   * `> 35 dB` → **Name_Detected** (Normal conversational speech)

### 3.2 Engineering Challenges & Solutions

#### The Expo Go Audio Session Constraint (The "Dead Mic" Problem)
**Problem:** Initially, when a threat was detected, we attempted to play a loud `ting.wav` warning sound. However, the iOS hardware audio session **cannot be in recording mode and playback mode simultaneously** in the standard Expo Go environment. Attempting to switch the session to playback mode mid-cycle immediately corrupted the `Audio.Recording` instance, causing the mic to die permanently after the first alert.
**Things we tried:**
- We tried suspending the capture cycle, switching to playback, playing the sound, and resuming capture. This introduced a race condition with the `expo-av` native bindings, often resulting in silent failures.
**The Solution:** We **completely removed audio playback** from the alert pipeline. Aegis relies 100% on its sophisticated haptic rhythms and high-contrast visual overlays (`TingAlert`). The audio session is locked to `allowsRecordingIOS: true` on initialization and is never touched again. This made the microphone loop bulletproof.

#### The "Silent Death" Watchdog
**Problem:** Even without playback interference, mobile OS background restrictions or sudden hardware interrupts (like an incoming phone call) can silently kill an active recording promise without throwing a catchable JS error.
**The Solution:** Implemented a **Watchdog Timer** in `AudioCapture.ts`. It polls every 3 seconds. If it detects that the audio capture cycle hasn't updated its timestamp in the last 2.5 seconds, it forcefully cleans up the dead recording instances and restarts the loop automatically.

#### The "Strangled Startup" (Location Permissions Crash)
**Problem:** We noticed the microphone wasn't starting on fresh boots. The root cause was a seemingly unrelated `requestLocationPermission()` call executing on mount. Because Expo Go's `Info.plist` lacks `NSLocation` usage keys by default, this permission request threw an unhandled Promise rejection. This crash aborted the entire JavaScript initialization chain *before* the audio capture could start (`initInference()`), effectively killing the microphone at birth.
**The Solution:** All peripheral permission requests (Location, Notifications) in `AlertContext.tsx` are now wrapped in `.catch(() => {})` blocks. They are treated as "best-effort" operations, ensuring that the core audio pipeline always initializes cleanly, regardless of peripheral native failures.

#### The Push Notification Native Crash
**Problem:** When triggering alerts, the app would crash instantly with: `Cannot cast 'nil' for field 'sound'`. Expo SDK 54 heavily refactored notifications, and providing `sound: true` incorrectly or not at all caused native iOS crashes. Additionally, push notifications are largely unsupported in Expo Go.
**The Solution:** We explicitly enforce `sound: true` in the notification payload to satisfy the iOS typing requirements, and wrap the entire `scheduleNotificationAsync` call in a `try/catch` block that swallows failures silently. The haptic and visual alert pipeline is treated as the primary notification mechanism.

#### Alert Flooding
**Problem:** In a noisy environment, the classifier would trigger hundreds of alerts a minute, creating a chaotic queue of UI popups and overlapping vibrations.
**The Solution:** 
1. **Global Cooldown**: Implemented a strict 2000ms global debounce across *all* alert types in `AudioInference.ts`.
2. **UI Alert Queue**: The `TingAlert` overlay manages a strict FIFO (First-In-First-Out) queue. It displays one alert at a time. The next alert will not render until the user explicitly taps the "ACKNOWLEDGED" button.

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

The Haptics Engine is driven purely by **TypeScript** utilizing the `expo-haptics` bridge. To prevent thread-blocking, complex rhythms are defined as strict generic arrays and streamed asynchronously utilizing micro-delays (`setTimeout` chaining), preventing UI thread freezes during intensive animations.

---

## 5. UI/UX: The "Aegis Ball" & Visual Identity

### The Aegis Ball
The central component of the app is a **dynamic fluid orb** built with Reanimated. 
* **IDLE**: A slow, breathing pulse.
* **ARMED**: The orb tightens, surrounded by animated golden glow rings, indicating the system is actively metering audio.
* **ALERT**: The orb expands violently and shifts to a high-contrast state (#FF4444), synchronized perfectly with the Haptic Syntax.

### Modern Full-Screen Navigation
The application features a fully immersive edge-to-edge layout (`SafeAreaView` optimized) and a custom floating `BottomNavBar` built entirely out of raw SVG paths for flawless scalability.

---

## 6. Implementation Roadmap

### Phase 1: The Foundation (Completed)
- [x] Define Medallion-inspired directory structure.
- [x] Set up `AlertContext` for global state management.
- [x] Implement the static `AegisBall` UI.

### Phase 2: Live Intelligence (Completed)
- [x] Implement Continuous Audio Capture using `expo-av`.
- [x] Build Heuristic dB Classifier bridging real sounds to Aegis Alert Types.
- [x] Fix iOS hardware audio session constraints (Watchdog timer + Haptics-only alerts).
- [x] Calibrate real-world phone microphone thresholds (Voice vs Horn vs Siren).

### Phase 3: The Awareness & Persistence (Completed/Future)
- [x] **Acoustic History**: A persistence layer using `AsyncStorage` to track daily threat spikes across sessions.
- [x] **Investor Demo Mode**: Hidden simulation feature on the AegisBall (Triple-tap).
- [ ] **TFLite Integration**: Swap the heuristic dB classifier with a true `react-native-fast-tflite` model (Requires Custom Native Dev Client `npx expo run:ios`).

---

## 7. SDG Alignment (United Nations)
Project Aegis is built with global social impact at its core:
* **SDG 3 (Health & Well-being)**: Protecting auditory health.
* **SDG 10 (Reduced Inequalities)**: Empowering the deaf and hard-of-hearing community through technology.
* **SDG 11 (Sustainable Cities)**: Increasing safety in dense urban environments.

---

## 8. State Management Architecture

Aegis uses a centralized, singleton-style context pattern (`AlertContext.tsx`):
1. **Hydration Engine**: On boot, Context silently loads historical events and user preferences from native device storage (`AsyncStorage`).
2. **Core State Trackers**:
   - `safetyMode`: A global boolean driving the `AudioCapture` loop and UI.
   - `alertHistory`: A serializable array of logged threat signatures across all sessions.
3. **Action Dispatchers**: Methods like `triggerAlert(type, db)` manipulate state and physically drive the hardware (via `expo-haptics`) in a single synchronous cycle.

---

## 9. Directory Structure
```text
📂 Aegis
├── 📂 app/             # Application Screens (index.tsx, history.tsx)
├── 📂 components/      # AegisBall.tsx, TingAlert.tsx, BottomNavBar.tsx
├── 📂 context/         # AlertContext.tsx (The Sentinel state logic)
├── 📂 services/        # AudioCapture.ts (Mic engine), AudioInference.ts
├── 📂 utils/           # HapticsEngine.ts, NotificationService.ts
├── 📂 assets/          # SVG Iconography
├── 📂 constants/       # Theme.ts, AcousticTiers.ts
└── 📄 context.md       # Master Reference Document
```
