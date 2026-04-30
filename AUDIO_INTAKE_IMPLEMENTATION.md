# 🎙️ Aegis: Sound Intake & Processing Pipeline Implementation

This document outlines the step-by-step implementation plan for the missing piece of the Aegis puzzle: **actually capturing live environmental audio and feeding it into the Machine Learning (TFLite) engine.**

Since Aegis requires near-zero latency and cannot afford memory leaks, we must bypass standard UI-blocking audio recorders and set up a continuous audio stream buffer.

---

## 1. The Strategy: Micro-Buffering

We cannot record 1-minute long audio files, save them to the disk, and then read them back. That takes too long and destroys the phone's flash storage. 
Instead, we need to capture **micro-buffers** (e.g., chunks of 975ms to match MobileNetV2 audio input sizes) in raw PCM format entirely in RAM.

### Recommended Tooling
For Expo, standard `expo-av` is primarily designed for playing/recording saved files. For continuous raw audio streaming, we have two paths:
1. **Easy Path:** Use `expo-audio-stream` or `react-native-audio-record` (via Custom Dev Client) to stream raw PCM buffers directly to JS.
2. **Hard/Performant Path:** Write a custom Expo Module (JSI/C++) that talks directly to iOS CoreAudio and Android Oboe.

*For this guide, we will outline the recommended middle-ground using a streaming library.*

---

## 2. Installation Requirements

Because we are moving outside standard Expo Go capabilities into raw hardware streaming, you will need to install a library capable of streaming and build a Custom Dev Client.

```bash
# Install audio streaming and file system (if intermediate saving is needed for testing)
npm install react-native-live-audio-stream
npx expo install expo-file-system

# Note: This requires prebuild to generate native code
npx expo prebuild
```

---

## 3. Implementation: The Sound Intake Engine

Here is how you actually write the code to intake sound and pipe it to your `AudioInference.ts` layer.

### Step 3.1: Requesting Microphone Permissions
Before any sound can be captured, iOS and Android strictly require user consent.

**Update `app.json` (Expo Config):**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        {
          "microphonePermission": "Aegis needs microphone access to detect emergency sirens and critical sounds."
        }
      ]
    ]
  }
}
```

### Step 3.2: Building the Audio Streamer (`services/AudioCapture.ts`)

Create a new file to handle the raw stream. This service initializes the microphone and continuously pulls 16kHz audio data (the standard sample rate for audio ML models).

```typescript
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { runInferenceOnBuffer } from './AudioInference';

export const AUDIO_CONFIG = {
  sampleRate: 16000,  // 16kHz is standard for YamNet / MobileNet audio models
  channels: 1,        // Mono audio is required for spectrograms
  bitsPerSample: 16,  // 16-bit PCM
  bufferSize: 4096,   // Number of samples per chunk
};

export function initializeAudioIntake() {
  LiveAudioStream.init(AUDIO_CONFIG);

  // This event listener fires continuously as the microphone captures data
  LiveAudioStream.on('data', (base64Data) => {
    // 1. Decode the base64 stream chunk back into raw binary PCM
    const pcmBuffer = Buffer.from(base64Data, 'base64');
    
    // 2. Convert PCM to Float32Array (required by Neural Networks)
    const floatArray = convertPCMToFloat32(pcmBuffer);

    // 3. Pipe directly into your Inference Engine
    // (This is where the magic happens!)
    runInferenceOnBuffer(floatArray);
  });
}

export function startListening() {
  LiveAudioStream.start();
}

export function stopListening() {
  LiveAudioStream.stop();
}

// Utility: Machine Learning models need normalized floats (-1.0 to 1.0), not raw 16-bit ints
function convertPCMToFloat32(buffer: Buffer): Float32Array {
  const floatArray = new Float32Array(buffer.length / 2);
  for (let i = 0; i < floatArray.length; i++) {
    // Read 16-bit integer and normalize
    const int16 = buffer.readInt16LE(i * 2);
    floatArray[i] = int16 / 32768.0; 
  }
  return floatArray;
}
```

---

## 4. Connecting Intake to the Context Layer

Now we must link this physical sound intake to your global `AlertContext.tsx` so the "Aegis Ball" reacts.

**Update `context/AlertContext.tsx`:**

```typescript
import { startListening, stopListening, initializeAudioIntake } from '../services/AudioCapture';

// Inside your AlertProvider component:

useEffect(() => {
  // Initialize the audio hardware bridge on mount
  initializeAudioIntake();

  if (state.safetyMode) {
    // 1. Turn on the physical microphone stream
    startListening();
    
    // 2. Start the Inference engine listener which processes the stream
    startInference((result) => {
      const event = createMockAlert(result.type, state.eventPatternMap, state.userName);
      dispatch({ type: 'TRIGGER_ALERT', payload: event });
    }, state.sensitivity);

  } else {
    // Turn off the microphone to save battery
    stopListening();
    stopInference();
  }

  return () => {
    stopListening();
    stopInference();
  };
}, [state.safetyMode]);
```

---

## 5. The Final Step: Signal Processing (Pre-TFLite)

Machine Learning models like AudioSet MobileNet usually do not take raw sound waves. They take **Spectrograms** (pictures of sound).

In `AudioInference.ts`, before you pass `floatArray` to the TFLite model, you need a lightweight Fast Fourier Transform (FFT) step:

```typescript
// Inside services/AudioInference.ts

export function runInferenceOnBuffer(audioSamples: Float32Array) {
  // 1. Accumulate chunks until you have exactly 0.975 seconds of audio
  // (e.g. 15,600 samples at 16kHz)
  
  // 2. Compute Mel Spectrogram (using a library like meyda or a custom FFT)
  // const spectrogram = computeMelSpectrogram(audioSamples);

  // 3. Feed the 2D array (Spectrogram) into the TFLite runtime
  // const output = tfliteModel.run(spectrogram);
  
  // 4. Determine classification and trigger callback if threshold met...
}
```

## Summary Checklist for Sound Intake
1. [ ] Install raw streaming library (`react-native-live-audio-stream` or `expo-audio-stream`).
2. [ ] Add Microphone permissions to `app.json`.
3. [ ] Rebuild the project (`npx expo run:ios` or `run:android`) because we added native audio code.
4. [ ] Implement the base64-to-Float32 decoding logic.
5. [ ] Wire the `startListening()` function directly to the `safetyMode` toggle in Context.
