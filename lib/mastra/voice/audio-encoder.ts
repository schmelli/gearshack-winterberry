/**
 * Audio Encoding Utilities
 * Feature: 001-mastra-agentic-voice
 * Task: T080 - Audio encoding optimization (<100KB for 10s clips)
 *
 * Provides audio compression and format conversion utilities for
 * optimal file size while maintaining transcription quality.
 *
 * Target: <100KB for 10-second clips
 * - Opus @ 16kbps = ~20KB/10s
 * - Opus @ 24kbps = ~30KB/10s
 * - Opus @ 32kbps = ~40KB/10s (default, good quality)
 */

// ============================================================================
// Types
// ============================================================================

export interface AudioEncoderConfig {
  /** Target bitrate in kbps (default: 32) */
  bitrate?: number;
  /** Sample rate in Hz (default: 16000 for speech) */
  sampleRate?: number;
  /** Number of audio channels (default: 1 mono) */
  channels?: number;
  /** MIME type preference */
  mimeType?: string;
}

export interface EncodedAudio {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  compressionRatio: number;
}

// ============================================================================
// Constants
// ============================================================================

// Optimized settings for speech transcription
export const SPEECH_OPTIMIZED_CONFIG: AudioEncoderConfig = {
  bitrate: 32, // 32kbps - good quality for speech
  sampleRate: 16000, // 16kHz - sufficient for speech recognition
  channels: 1, // Mono - halves file size
};

// High quality settings (for archiving)
export const HIGH_QUALITY_CONFIG: AudioEncoderConfig = {
  bitrate: 64,
  sampleRate: 48000,
  channels: 1,
};

// Ultra-compressed settings (for bandwidth-constrained)
export const ULTRA_COMPRESSED_CONFIG: AudioEncoderConfig = {
  bitrate: 16, // 16kbps - minimum for intelligible speech
  sampleRate: 16000,
  channels: 1,
};

// MIME type priority for optimal compression
export const MIME_TYPE_PRIORITY = [
  'audio/webm;codecs=opus', // Best compression
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the best supported MIME type for recording
 */
export function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  for (const mimeType of MIME_TYPE_PRIORITY) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return 'audio/webm';
}

/**
 * Get MediaRecorder options optimized for speech
 */
export function getRecorderOptions(config: AudioEncoderConfig = {}): MediaRecorderOptions {
  const { bitrate = 32, mimeType } = config;
  const selectedMimeType = mimeType || getBestMimeType();

  const options: MediaRecorderOptions = {
    mimeType: selectedMimeType,
  };

  // Set bitrate if supported
  if ('audioBitsPerSecond' in MediaRecorder.prototype) {
    options.audioBitsPerSecond = bitrate * 1000;
  }

  return options;
}

/**
 * Get audio constraints optimized for speech transcription
 */
export function getSpeechAudioConstraints(config: AudioEncoderConfig = {}): MediaTrackConstraints {
  const { sampleRate = 16000, channels = 1 } = config;

  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: sampleRate },
    channelCount: { ideal: channels },
  };
}

/**
 * Estimate the file size for a given duration and bitrate
 * @param durationMs - Duration in milliseconds
 * @param bitrateKbps - Bitrate in kbps
 * @returns Estimated size in bytes
 */
export function estimateFileSize(durationMs: number, bitrateKbps: number = 32): number {
  const seconds = durationMs / 1000;
  const bitsPerSecond = bitrateKbps * 1000;
  const totalBits = seconds * bitsPerSecond;
  const bytes = totalBits / 8;

  // Add ~10% overhead for container format
  return Math.ceil(bytes * 1.1);
}

/**
 * Check if audio size is within acceptable limits
 * Target: <100KB for 10 seconds
 */
export function isWithinSizeLimit(sizeBytes: number, durationMs: number): boolean {
  const maxBytesPerSecond = 100 * 1024 / 10; // 100KB per 10s = ~10KB/s
  const seconds = durationMs / 1000;
  const maxBytes = maxBytesPerSecond * seconds;

  return sizeBytes <= maxBytes;
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (compressedSize === 0) return 0;
  return originalSize / compressedSize;
}

// ============================================================================
// Audio Processing
// ============================================================================

/**
 * Convert audio blob to ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

/**
 * Get audio duration from blob (approximate for encoded audio)
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    // Timeout after 5 seconds to prevent hanging
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Audio metadata loading timed out'));
    }, 5000);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      clearTimeout(timeoutId);
    };

    audio.addEventListener('loadedmetadata', () => {
      cleanup();
      resolve(audio.duration * 1000); // Convert to ms
    });

    audio.addEventListener('error', () => {
      cleanup();
      reject(new Error('Failed to load audio metadata'));
    });

    audio.src = url;
  });
}

/**
 * Create encoded audio result from recorded chunks
 */
export async function createEncodedAudio(
  chunks: Blob[],
  mimeType: string,
  recordingDurationMs: number,
  originalSizeEstimate?: number
): Promise<EncodedAudio> {
  const blob = new Blob(chunks, { type: mimeType });
  const sizeBytes = blob.size;

  // Try to get actual duration, fall back to recording duration
  let durationMs = recordingDurationMs;
  try {
    durationMs = await getAudioDuration(blob);
  } catch {
    // Use recording duration as fallback
  }

  const compressionRatio = originalSizeEstimate
    ? calculateCompressionRatio(originalSizeEstimate, sizeBytes)
    : 1;

  return {
    blob,
    mimeType,
    durationMs,
    sizeBytes,
    compressionRatio,
  };
}

// ============================================================================
// Diagnostics
// ============================================================================

/**
 * Get audio encoding diagnostics for debugging
 */
export function getEncodingDiagnostics(audio: EncodedAudio): {
  sizeKB: number;
  durationSeconds: number;
  bitrateKbps: number;
  isWithinLimit: boolean;
  targetBitrateKbps: number;
} {
  const sizeKB = audio.sizeBytes / 1024;
  const durationSeconds = audio.durationMs / 1000;
  const bitrateKbps = durationSeconds > 0 ? (audio.sizeBytes * 8) / 1000 / durationSeconds : 0;
  const isWithinLimit = isWithinSizeLimit(audio.sizeBytes, audio.durationMs);

  // Calculate target bitrate for 100KB/10s limit
  const targetBitrateKbps = (100 * 1024 * 8) / 10 / 1000; // ~80kbps

  return {
    sizeKB: Math.round(sizeKB * 10) / 10,
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    bitrateKbps: Math.round(bitrateKbps),
    isWithinLimit,
    targetBitrateKbps: Math.round(targetBitrateKbps),
  };
}
