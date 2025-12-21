/**
 * Text-to-Speech Integration
 * Feature: 001-mastra-agentic-voice
 * Task: T072 - Create TTS integration
 * Task: T075 - Implement streaming TTS
 *
 * Wraps OpenAI TTS API for speech synthesis with:
 * - Streaming support for low-latency playback
 * - Multiple voice options
 * - Quality vs speed trade-off (tts-1 vs tts-1-hd)
 */

import OpenAI from 'openai';
import { logInfo, logError, logDebug } from '../logging';
import { recordVoiceSynthesis } from '../metrics';

// ============================================================================
// Types
// ============================================================================

/**
 * Available TTS voices
 */
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * TTS model selection
 * - tts-1: Faster, lower quality
 * - tts-1-hd: Slower, higher quality
 */
export type TTSModel = 'tts-1' | 'tts-1-hd';

/**
 * Audio output format
 */
export type TTSFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/**
 * Options for speech synthesis
 */
export interface SynthesisOptions {
  /** Voice to use (default: nova) */
  voice?: TTSVoice;
  /** Model to use (default: tts-1 for speed) */
  model?: TTSModel;
  /** Output format (default: mp3) */
  format?: TTSFormat;
  /** Speech speed (0.25 - 4.0, default: 1.0) */
  speed?: number;
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
 * Voice metadata for UI display
 */
export const VOICE_OPTIONS: Array<{
  value: TTSVoice;
  label: string;
  description: string;
}> = [
  { value: 'nova', label: 'Nova', description: 'Female, warm and natural (recommended)' },
  { value: 'alloy', label: 'Alloy', description: 'Neutral, balanced' },
  { value: 'echo', label: 'Echo', description: 'Male, deep and expressive' },
  { value: 'fable', label: 'Fable', description: 'British accent, storytelling' },
  { value: 'onyx', label: 'Onyx', description: 'Male, deep and authoritative' },
  { value: 'shimmer', label: 'Shimmer', description: 'Female, soft and soothing' },
];

/**
 * Content types for audio formats
 */
const FORMAT_CONTENT_TYPES: Record<TTSFormat, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
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

// ============================================================================
// OpenAI Client
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
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
    voice = 'nova',
    model = 'tts-1',
    format = 'mp3',
    speed = 1.0,
  } = options;

  logDebug('Starting speech synthesis (streaming)', {
    metadata: {
      textLength: text.length,
      voice,
      model,
      format,
    },
  });

  try {
    const openai = getOpenAIClient();

    const response = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: format,
      speed,
    });

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
    // The OpenAI SDK returns a Response with a body stream
    return response.body as unknown as ReadableStream<Uint8Array>;
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
    voice = 'nova',
    model = 'tts-1',
    format = 'mp3',
    speed = 1.0,
  } = options;

  logDebug('Starting speech synthesis (buffered)', {
    metadata: {
      textLength: text.length,
      voice,
      model,
      format,
    },
  });

  try {
    const openai = getOpenAIClient();

    const response = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: format,
      speed,
    });

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
export function getCachedAudio(text: string, voice: TTSVoice = 'nova'): Buffer | null {
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
  voice: TTSVoice = 'nova',
  format: TTSFormat = 'mp3'
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
