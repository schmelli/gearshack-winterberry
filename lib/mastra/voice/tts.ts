/**
 * Text-to-Speech Integration with ElevenLabs
 * Feature: 001-mastra-agentic-voice
 * Task: T072 - Create TTS integration
 * Task: T075 - Implement streaming TTS
 *
 * Wraps ElevenLabs TTS API for speech synthesis with:
 * - Streaming support for low-latency playback
 * - Multiple voice options with natural-sounding voices
 * - Quality settings via model selection
 */

import { logInfo, logError, logDebug } from '../logging';
import { recordVoiceSynthesis } from '../metrics';

// ============================================================================
// Types
// ============================================================================

/**
 * Available TTS voices (ElevenLabs voice IDs mapped to friendly names)
 */
export type TTSVoice = 'rachel' | 'domi' | 'bella' | 'antoni' | 'josh' | 'adam';

/**
 * ElevenLabs model selection
 * - eleven_turbo_v2_5: Fast, lower latency (recommended for realtime)
 * - eleven_multilingual_v2: Higher quality, supports multiple languages
 */
export type TTSModel = 'eleven_turbo_v2_5' | 'eleven_multilingual_v2';

/**
 * Audio output format
 */
export type TTSFormat = 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000';

/**
 * Options for speech synthesis
 */
export interface SynthesisOptions {
  /** Voice to use (default: rachel) */
  voice?: TTSVoice;
  /** Model to use (default: eleven_turbo_v2_5 for speed) */
  model?: TTSModel;
  /** Output format (default: mp3_44100_128) */
  format?: TTSFormat;
  /** Stability (0.0 - 1.0, default: 0.5) - lower = more expressive */
  stability?: number;
  /** Similarity boost (0.0 - 1.0, default: 0.75) */
  similarityBoost?: number;
}

/**
 * Result from non-streaming synthesis
 */
export interface SynthesisResult {
  /** Audio data as Buffer */
  audio: Buffer;
  /** Audio format */
  format: TTSFormat;
  /** Content type for HTTP response */
  contentType: string;
  /** Synthesis latency in milliseconds */
  durationMs: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * ElevenLabs voice ID mapping
 */
const VOICE_IDS: Record<TTSVoice, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  antoni: 'ErXwobaYiN019PkySvjV',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  adam: 'pNInz6obpgDQGcFmaJgB',
};

/**
 * Voice metadata for UI display
 */
export const VOICE_OPTIONS: Array<{
  value: TTSVoice;
  label: string;
  description: string;
}> = [
  { value: 'rachel', label: 'Rachel', description: 'Female, calm and warm (recommended)' },
  { value: 'bella', label: 'Bella', description: 'Female, soft and friendly' },
  { value: 'domi', label: 'Domi', description: 'Female, confident and clear' },
  { value: 'josh', label: 'Josh', description: 'Male, deep and authoritative' },
  { value: 'adam', label: 'Adam', description: 'Male, natural and expressive' },
  { value: 'antoni', label: 'Antoni', description: 'Male, warm storytelling voice' },
];

/**
 * Content types for audio formats
 */
const FORMAT_CONTENT_TYPES: Record<TTSFormat, string> = {
  mp3_44100_128: 'audio/mpeg',
  mp3_22050_32: 'audio/mpeg',
  pcm_16000: 'audio/pcm',
  pcm_22050: 'audio/pcm',
  pcm_24000: 'audio/pcm',
};

/**
 * Common phrases to cache (T081)
 */
export const CACHEABLE_PHRASES = [
  "I didn't catch that clearly. Could you try again?",
  "I'm sorry, I couldn't understand your request. Could you rephrase it?",
  "Processing your request...",
  "Let me look that up for you.",
  "Here's what I found:",
];

/**
 * ElevenLabs API base URL
 */
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// ============================================================================
// API Client
// ============================================================================

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }
  return apiKey;
}

// ============================================================================
// Synthesis Functions
// ============================================================================

/**
 * Synthesize speech from text with streaming support
 *
 * Returns a ReadableStream for streaming audio to the client.
 * Use this for low-latency playback where audio starts before synthesis completes.
 *
 * @param text - Text to synthesize
 * @param options - Synthesis options
 * @returns ReadableStream of audio data
 *
 * @example
 * ```typescript
 * const stream = await synthesizeSpeechStream("Hello, how can I help?");
 * return new Response(stream, {
 *   headers: { 'Content-Type': 'audio/mpeg' }
 * });
 * ```
 */
export async function synthesizeSpeechStream(
  text: string,
  options: SynthesisOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const startTime = Date.now();
  const {
    voice = 'rachel',
    model = 'eleven_turbo_v2_5',
    format = 'mp3_44100_128',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const voiceId = VOICE_IDS[voice];

  logDebug('Starting speech synthesis (streaming)', {
    metadata: {
      textLength: text.length,
      voice,
      model,
      format,
    },
  });

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': FORMAT_CONTENT_TYPES[format],
          'Content-Type': 'application/json',
          'xi-api-key': getApiKey(),
        },
        body: JSON.stringify({
          text,
          model_id: model,
          output_format: format,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const durationMs = Date.now() - startTime;

    // Record metrics
    recordVoiceSynthesis(model, durationMs);

    logInfo('Speech synthesis started (streaming)', {
      metadata: {
        textLength: text.length,
        voice,
        model,
        durationMs,
      },
    });

    // Return the response body as a stream
    // Guard against null response.body (can occur with network errors or certain response types)
    if (!response.body) {
      throw new SynthesisError('Response body is null - unable to stream audio', 'EMPTY_RESPONSE');
    }
    return response.body;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logError('Speech synthesis failed', error instanceof Error ? error : undefined, {
      metadata: { durationMs, textLength: text.length },
    });

    throw new SynthesisError(
      error instanceof Error ? error.message : 'Unknown synthesis error',
      'SYNTHESIS_FAILED'
    );
  }
}

/**
 * Synthesize speech from text (non-streaming)
 *
 * Returns the complete audio buffer. Use this when you need the full
 * audio before responding (e.g., for caching).
 *
 * @param text - Text to synthesize
 * @param options - Synthesis options
 * @returns SynthesisResult with audio buffer and metadata
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesisOptions = {}
): Promise<SynthesisResult> {
  const startTime = Date.now();
  const {
    voice = 'rachel',
    model = 'eleven_turbo_v2_5',
    format = 'mp3_44100_128',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const voiceId = VOICE_IDS[voice];

  logDebug('Starting speech synthesis (buffered)', {
    metadata: {
      textLength: text.length,
      voice,
      model,
      format,
    },
  });

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': FORMAT_CONTENT_TYPES[format],
          'Content-Type': 'application/json',
          'xi-api-key': getApiKey(),
        },
        body: JSON.stringify({
          text,
          model_id: model,
          output_format: format,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    const durationMs = Date.now() - startTime;

    // Record metrics
    recordVoiceSynthesis(model, durationMs);

    logInfo('Speech synthesis completed', {
      metadata: {
        textLength: text.length,
        audioSize: audio.length,
        voice,
        model,
        durationMs,
      },
    });

    return {
      audio,
      format,
      contentType: FORMAT_CONTENT_TYPES[format],
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logError('Speech synthesis failed', error instanceof Error ? error : undefined, {
      metadata: { durationMs, textLength: text.length },
    });

    throw new SynthesisError(
      error instanceof Error ? error.message : 'Unknown synthesis error',
      'SYNTHESIS_FAILED'
    );
  }
}

/**
 * Get content type for a TTS format
 */
export function getContentType(format: TTSFormat): string {
  return FORMAT_CONTENT_TYPES[format] || 'audio/mpeg';
}

/**
 * Check if a phrase should be cached (T081)
 */
export function isCacheablePhrase(text: string): boolean {
  const normalizedText = text.toLowerCase().trim();
  return CACHEABLE_PHRASES.some(phrase =>
    normalizedText.includes(phrase.toLowerCase())
  );
}

// ============================================================================
// TTS Response Cache (T081)
// ============================================================================

/**
 * In-memory cache for common TTS responses
 * Key: normalized text, Value: audio buffer
 */
const ttsCache = new Map<string, {
  audio: Buffer;
  format: TTSFormat;
  cachedAt: Date;
  voice: TTSVoice;
}>();

/** Cache TTL: 24 hours */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Get cached TTS audio if available
 *
 * @param text - Text that was synthesized
 * @param voice - Voice used
 * @returns Cached audio buffer or null
 */
export function getCachedAudio(text: string, voice: TTSVoice = 'rachel'): Buffer | null {
  const key = `${voice}:${text.toLowerCase().trim()}`;
  const cached = ttsCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if cache is expired
  if (Date.now() - cached.cachedAt.getTime() > CACHE_TTL_MS) {
    ttsCache.delete(key);
    return null;
  }

  logDebug('TTS cache hit', {
    metadata: { textLength: text.length, voice },
  });

  return cached.audio;
}

/**
 * Cache TTS audio for future requests
 *
 * @param text - Text that was synthesized
 * @param audio - Audio buffer to cache
 * @param voice - Voice used
 * @param format - Audio format
 */
export function cacheAudio(
  text: string,
  audio: Buffer,
  voice: TTSVoice = 'rachel',
  format: TTSFormat = 'mp3_44100_128'
): void {
  const key = `${voice}:${text.toLowerCase().trim()}`;

  ttsCache.set(key, {
    audio,
    format,
    cachedAt: new Date(),
    voice,
  });

  logDebug('TTS audio cached', {
    metadata: {
      textLength: text.length,
      audioSize: audio.length,
      voice,
    },
  });
}

/**
 * Clear expired cache entries
 */
export function cleanupCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of ttsCache.entries()) {
    if (now - value.cachedAt.getTime() > CACHE_TTL_MS) {
      ttsCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logDebug('TTS cache cleanup', { metadata: { entriesRemoved: cleaned } });
  }

  return cleaned;
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error class for synthesis failures
 */
export class SynthesisError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SynthesisError';
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SynthesisError);
    }
  }
}
