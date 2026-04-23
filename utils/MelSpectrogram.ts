// ─── MelSpectrogram.ts ───────────────────────────────────────────────
// Converts raw PCM audio (Float32Array) into a Mel-spectrogram tensor
// matching YAMNet's expected input shape: [1, 96, 64, 1]
//
// This is the JS-layer implementation. In the native path this runs
// in C++ (Oboe/AVAudioEngine) before hitting the JS bridge.
//
// Input:  Float32Array of PCM samples at 16kHz
// Output: Float32Array shaped as [96 × 64] = 6144 values (flattened)
// ─────────────────────────────────────────────────────────────────────

import {
  AUDIO_SAMPLE_RATE,
  MEL_BINS,
  MEL_FRAMES,
  AUDIO_BUFFER_SIZE_MS,
} from '../constants/AcousticTiers';

// ─── FFT (Cooley-Tukey, power-of-2 only) ────────────────────────────

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Cooley-Tukey butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = real[i + k];
        const uIm = imag[i + k];
        const vRe = real[i + k + len / 2] * curRe - imag[i + k + len / 2] * curIm;
        const vIm = real[i + k + len / 2] * curIm + imag[i + k + len / 2] * curRe;
        real[i + k] = uRe + vRe;
        imag[i + k] = uIm + vIm;
        real[i + k + len / 2] = uRe - vRe;
        imag[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

// ─── Hann Window ─────────────────────────────────────────────────────

function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

// ─── Mel Filterbank ──────────────────────────────────────────────────

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function buildMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  fMin = 125,
  fMax = 7500,
): Float32Array[] {
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);
  const melPoints = Array.from(
    { length: numFilters + 2 },
    (_, i) => melToHz(melMin + (i * (melMax - melMin)) / (numFilters + 1)),
  );
  const binFreqs = melPoints.map((f) => Math.floor((fftSize + 1) * f / sampleRate));

  return Array.from({ length: numFilters }, (_, m) => {
    const filter = new Float32Array(fftSize / 2 + 1);
    for (let k = binFreqs[m]; k < binFreqs[m + 1]; k++) {
      filter[k] = (k - binFreqs[m]) / (binFreqs[m + 1] - binFreqs[m]);
    }
    for (let k = binFreqs[m + 1]; k < binFreqs[m + 2]; k++) {
      filter[k] = (binFreqs[m + 2] - k) / (binFreqs[m + 2] - binFreqs[m + 1]);
    }
    return filter;
  });
}

// ─── Main Transform ──────────────────────────────────────────────────

const FFT_SIZE = 512;
const HOP_SIZE = Math.floor((AUDIO_SAMPLE_RATE * AUDIO_BUFFER_SIZE_MS) / 1000 / MEL_FRAMES);
const _window = hannWindow(FFT_SIZE);
const _filterbank = buildMelFilterbank(MEL_BINS, FFT_SIZE, AUDIO_SAMPLE_RATE);

/**
 * Convert a raw PCM buffer (Float32Array at 16kHz) into a flattened
 * Mel-spectrogram tensor of shape [MEL_FRAMES × MEL_BINS] = [96 × 64].
 *
 * @param pcm  Raw audio samples, normalised to [-1, 1]
 * @returns    Float32Array of length 6144, ready for YAMNet TFLite input
 */
export function melSpectrogram(pcm: Float32Array): Float32Array {
  const output = new Float32Array(MEL_FRAMES * MEL_BINS);

  for (let frame = 0; frame < MEL_FRAMES; frame++) {
    const offset = frame * HOP_SIZE;
    const real = new Float32Array(FFT_SIZE);
    const imag = new Float32Array(FFT_SIZE);

    // Apply Hann window to this frame
    for (let i = 0; i < FFT_SIZE; i++) {
      real[i] = (pcm[offset + i] ?? 0) * _window[i];
    }

    fft(real, imag);

    // Compute power spectrum
    const power = new Float32Array(FFT_SIZE / 2 + 1);
    for (let i = 0; i <= FFT_SIZE / 2; i++) {
      power[i] = real[i] * real[i] + imag[i] * imag[i];
    }

    // Apply Mel filterbank + log compression
    for (let m = 0; m < MEL_BINS; m++) {
      let energy = 0;
      const filter = _filterbank[m];
      for (let k = 0; k < filter.length; k++) {
        energy += filter[k] * power[k];
      }
      output[frame * MEL_BINS + m] = Math.log(Math.max(energy, 1e-10));
    }
  }

  return output;
}

/**
 * Convert a base64-encoded PCM chunk (from react-native-audio-record)
 * into a Float32Array of normalised samples.
 */
export function base64PcmToFloat32(base64: string, bitsPerSample = 16): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const bytesPerSample = bitsPerSample / 8;
  const samples = new Float32Array(bytes.length / bytesPerSample);
  const maxVal = Math.pow(2, bitsPerSample - 1);

  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const raw = view.getInt16(i * bytesPerSample, true); // little-endian
    samples[i] = raw / maxVal;
  }
  return samples;
}
