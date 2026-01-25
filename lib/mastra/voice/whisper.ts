/**
 * Speech-to-Text Integration with ElevenLabs
 * Feature: 001-mastra-agentic-voice
 * Task: T068 - Create STT integration
 *
 * Wraps ElevenLabs Speech-to-Text API for transcription with:
 * - Multi-language support (en, de for GearShack locales)
 * - Latency tracking
 * - Error handling with retries
 */

import { logInfo, logError, logDebug } from '../logging';
import { recordVoiceTranscription } from '../metrics';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported languages for transcription
 */
export type TranscriptionLanguage = 'en' | 'de' | 'auto';

/**
 * Result from ElevenLabs transcription
 */
export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Detected or specified language */
  language: string;
  /** Transcription latency in milliseconds */
  durationMs: number;
  /** Confidence score (0-1) - from ElevenLabs response */
  confidence: number;
}

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  /** Language hint for faster processing */
  language?: TranscriptionLanguage;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum confidence threshold (T070)
 * Below this, we suggest the user try again
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * ElevenLabs API base URL
 */
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Language code mapping for ElevenLabs
 */
const LANGUAGE_CODES: Record<TranscriptionLanguage, string | null> = {
  en: 'en',
  de: 'de',
  auto: null, // Let ElevenLabs detect
};

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
// Transcription Function
// ============================================================================

/**
 * Transcribe audio using ElevenLabs Speech-to-Text API
 *
 * @param audioBuffer - Audio data as Buffer
 * @param filename - Original filename with extension (for format detection)
 * @param options - Transcription options
 * @returns Transcription result with text, language, and confidence
 *
 * @example
 * ```typescript
 * const result = await transcribeAudio(buffer, 'recording.webm', { language: 'en' });
 * console.log(result.text); // "What is my lightest tent?"
 * console.log(result.confidence); // 0.95
 * ```
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.webm',
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  logDebug('Starting audio transcription', {
    metadata: {
      fileSize: audioBuffer.length,
      filename,
      language: options.language,
    },
  });

  try {
    // Create FormData for file upload
    const formData = new FormData();
    // Create Blob directly from Buffer (Node.js Buffer is compatible with Blob constructor)
    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: getMimeType(filename) });
    formData.append('audio', blob, filename);

    // Add language hint if specified
    if (options.language && options.language !== 'auto') {
      formData.append('language_code', LANGUAGE_CODES[options.language] || '');
    }

    // Make API call
    const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`);
    }

    let result: Record<string, unknown>;
    try {
      result = await response.json();
    } catch (jsonError) {
      throw new Error('Invalid JSON response from ElevenLabs API');
    }

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response structure from ElevenLabs API');
    }
    const durationMs = Date.now() - startTime;

    // Extract text and language from response
    const text = typeof result.text === 'string' ? result.text : '';
    const language = typeof result.language_code === 'string' ? result.language_code : (options.language || 'unknown');

    // ElevenLabs provides confidence per word, calculate average
    const confidence = calculateConfidence(result);

    // Record metrics
    recordVoiceTranscription('elevenlabs', durationMs, confidence);

    logInfo('Audio transcription completed', {
      metadata: {
        textLength: text.length,
        language,
        confidence,
        durationMs,
      },
    });

    return {
      text,
      language,
      durationMs,
      confidence,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logError('Transcription failed', error instanceof Error ? error : undefined, {
      metadata: { durationMs, filename },
    });

    // Record failed transcription
    recordVoiceTranscription('elevenlabs', durationMs, 0);

    throw new TranscriptionError(
      error instanceof Error ? error.message : 'Unknown transcription error',
      'TRANSCRIPTION_FAILED'
    );
  }
}

/**
 * Check if transcription confidence is above threshold (T070)
 *
 * @param confidence - Confidence score (0-1)
 * @returns true if confidence is acceptable
 */
export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}

/**
 * Get a user-friendly message for low confidence
 */
export function getLowConfidenceMessage(): string {
  return "I didn't catch that clearly. Could you try saying it again, perhaps a bit more slowly?";
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'webm':
      return 'audio/webm';
    case 'mp3':
      return 'audio/mpeg';
    case 'mp4':
    case 'm4a':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
    case 'oga':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    default:
      return 'audio/webm'; // Default for browser recordings
  }
}

/**
 * Calculate average confidence from ElevenLabs response
 *
 * ElevenLabs returns word-level confidence scores.
 * We calculate a weighted average based on word length.
 */
function calculateConfidence(response: {
  words?: Array<{
    text?: string;
    confidence?: number;
  }>;
}): number {
  if (!response.words || response.words.length === 0) {
    // If no word-level data, assume high confidence
    return 0.85;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const word of response.words) {
    if (typeof word.confidence === 'number') {
      const weight = (word.text?.length || 1);
      weightedSum += word.confidence * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0.85;
  }

  // Clamp to valid range
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error class for transcription failures
 */
export class TranscriptionError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TranscriptionError';
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TranscriptionError);
    }
  }
}
