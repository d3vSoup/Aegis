# 🚀 Project Aegis: Strategic Next Steps & Technical TODO Tasklist

This document outlines the strategic recommendations, technical improvements, and the immediate actionable TODOs to elevate **Project Aegis** from an impressive proof-of-concept to a robust, deployment-ready product.

---

## 1. Strategic Recommendations & Architecture Upgrades

### A. The Inference Engine: Switch to INT8 Quantized YAMNet
While MobileNetV2 is excellent, **YAMNet** is a pre-trained deep neural network specifically designed by Google to predict audio events from the AudioSet dataset. 
*   **Action**: Use a quantized (INT8) version of YAMNet for TFLite. It uses significantly less memory, preserving battery life and allowing faster inference frames (vital for rapid haptic response).
*   **Why**: Reduced model size with negligible accuracy loss on primary classes (Sirens, Horns).

### B. Overcoming the Audio Buffer Bottleneck
`expo-av` is primarily designed for playing audio and saving recorded files. Feeding raw PCM byte arrays streaming in real-time into a TFLite model from `expo-av` in JS space can introduce lag and overhead.
*   **Action**: Instead of standard `expo-av` recording, configure a custom native audio bridge or use **`react-native-audio-record`** which allows subscribing to live PCM base64 streams.
*   **Long-Term**: Build a lightweight native module (using Oboe for Android and AVAudioEngine for iOS) that captures the buffer, runs the TFLite inference in native C++, and only bridges the *result* (e.g., "Siren Detected") to JS.

### C. Persistent "ARMED" State: OS Background Constraints
React Native execution pauses when the app goes to the background. An environmental shield must work while the phone is locked in a pocket.
*   **Action (Android)**: Implement an Android Foreground Service using `expo-task-manager` or `notifee`. The user must see a persistent silent notification (e.g., "Aegis Shield Active") to keep the OS from killing the process.
*   **Action (iOS)**: Ensure the `UIBackgroundModes` array in `Info.plist` includes `audio` and `processing`. Actively playing silent audio might be required to keep the microphone active indefinitely in the background on iOS.

### D. The Horizon: Wearable Integration
A phone vibrating in a pocket or purse is often missed, especially for the hearing impaired. The haptic wrist experience is far superior.
*   **Action**: In Phase 3, map out companion apps for **WatchOS (Apple Watch)** and **WearOS**. The phone serves as the high-powered microphone and TFLite inference engine, while the watch receives Bluetooth triggers to execute the `Heartbeat` or `Staccato` haptic commands directly on the user's wrist.

### E. Adaptive Sensitivity & Geofencing
Aegis risks "alert fatigue" if it constantly triggers for car horns while the user is inside an Uber, or barks while at a dog park.
*   **Action**: Use standard OS generic activity detection (e.g., "in a vehicle") to dampen sensitivity.
*   **Action**: Add "Safe Zones" using Geofencing, where monitoring is paused or limited to critical bounds to conserve processing and battery life.

---

## 2. Exhaustive Step-by-Step TODO List

### Phase 2: Intelligence & Audio Pipeline (Immediate)

#### 2.1 Model Preparation
- [ ] **Find/Train Model**: Download YAMNet or the existing AudioSet MobileNetV2 TFLite model.
- [ ] **Asset Integration**: Place the `.tflite` model in the `/assets/models/` folder.
- [ ] **Install TFLite Runtime**: Run `npx expo install react-native-fast-tflite`.
- [ ] **Initialize Model JS Layer**: Create `services/AudioInference.ts` to load the model asynchronously on application start.

#### 2.2 Audio Buffer Pipeline
- [ ] **Install Recorder API**: Integrate `react-native-audio-record` or configure `expo-av` correctly for raw buffer emissions.
- [ ] **Permissions Management**: Add rigorous UX flow for Microphone permissions, explaining exactly *why* the mic needs to be "Listening" continuously.
- [ ] **Spectrogram Transformation**: Write a utility function (or native method) to convert raw PCM audio streams into Mel-Spectrogram inputs suitable for the TFLite tensor requirements.
- [ ] **Inference Loop**: Setup a `setInterval` or stream listener that runs inference every 500ms to 1s on overlapping buffer segments.

#### 2.3 Bridge AI Output to State
- [ ] **Confidence Thresholds**: Map model output logits to percentages. Only trigger `AlertContext` dispatch if Siren > 85%, Horn > 90%.
- [ ] **Debounce Logic**: Implement a debounce in `AlertManager.ts` so a 10-second siren doesn’t queue 50 staccato haptic alerts.

### Phase 3: The Awareness & Persistence (Short-term)

#### 3.1 Acoustic History Tracker
- [ ] **Install Storage**: `npx expo install @react-native-async-storage/async-storage`.
- [ ] **Database Logic**: Save lightweight JSON logs of triggered events (Type, Confidence, Timestamp).
- [ ] **History UI**: Build out `/app/history.tsx` to read the AsyncStorage and render a beautiful, minimalist list of the day's threats.

#### 3.2 Advanced Customizations
- [ ] **Settings Scaffolding**: Create the settings schema for user preferences (Sensitivity Sliders per class, Global toggle, Safe zones).
- [ ] **Microphone Calibration Routine**: Create a 5-second onboarding UX flow where the app calibrates its baseline ambient noise level.

#### 3.3 Battery & Background Operations
- [ ] **Foreground Service (Android)**: Implement persistent background tracking constraints.
- [ ] **Background Audio (iOS)**: Update app config for iOS Audio background capabilities.
- [ ] **Battery Telemetry**: Add simple debug metrics to monitor battery drain percentage while ARMED; optimize pooling frequency dynamically based on phone battery status.

### Phase 4: Polish & Delivery (Hackathon / Beta Release)
- [x] **Splash Screen & Icons**: Finalize the deep void black and solar gold app icon.
- [x] **Onboarding Carousel**: Create a 3-page swipe intro explaining "The Haptic Syntax" to the user, allowing them to explicitly "Test" the haptics before using the app.
- [ ] **Accessibility Labelling**: Ensure full VoiceOver (iOS) and TalkBack (Android) support on all custom UI elements so the app is inherently accessible to its target demographic. 
- [x] **Demo Video Mode**: Build a hidden "Simulation" mode where tapping the "Aegis Ball" cycles through fake audio triggers to demonstrate haptics to judges or investors easily.
- [ ] **Package Alignment**: Upgrade `expo-splash-screen` to `~31.0.13` (per bundler warning) for guaranteed compatibility with current Expo SDK.
