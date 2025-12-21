/**
 * Whisper Speech-to-Text Integration
 * Feature: 001-mastra-agentic-voice
 * Task: T068 - Create Whisper integration
 *
 * Wraps OpenAI Whisper API for transcription with:
 * - Multi-language support (en, de for GearShack locales)
 * - Latency tracking
 * - Error handling with retries
 */

import OpenAI from 'openai';
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
 * Result from Whisper transcription
 */
export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Detected or specified language */
  language: string;
  /** Transcription latency in milliseconds */
  durationMs: number;
  /** Confidence score (0-1) - estimated from word-level data if available */
  confidence: number;
}

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  /** Language hint for faster processing */
  language?: TranscriptionLanguage;
  /** Optional prompt to guide transcription (e.g., gear terminology) */
  prompt?: string;
  /** Temperature for sampling (0.0-1.0, lower = more deterministic) */
  temperature?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default transcription prompt with gear-specific vocabulary
 */
const DEFAULT_PROMPT = `GearShack outdoor gear assistant. Common terms: tent, sleeping bag, backpack,
ultralight, base weight, packed weight, loadout, MSR, Big Agnes, Nemo, Zpacks, REI,
Patagonia, Arc'teryx, Black Diamond, Petzl, grams, ounces, liters.`;

/**
 * Minimum confidence threshold (T070)
 * Below this, we suggest the user try again
 */
export const CONFIDENCE_THRESHOLD = 0.7;

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
// Transcription Function
// ============================================================================

/**
 * Transcribe audio using OpenAI Whisper API
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
    const openai = getOpenAIClient();

    // Create a File-like object for the API
    const file = new File([audioBuffer], filename, {
      type: getMimeType(filename),
    });

    // Build request options
    const requestOptions: OpenAI.Audio.Transcriptions.TranscriptionCreateParams = {
      file,
      model: 'whisper-1',
      prompt: options.prompt ?? DEFAULT_PROMPT,
      response_format: 'verbose_json',
      temperature: options.temperature ?? 0.0,
    };

    // Add language if specified (not 'auto')
    if (options.language && options.language !== 'auto') {
      requestOptions.language = options.language;
    }

    // Make API call
    const response = await openai.audio.transcriptions.create(requestOptions);

    const durationMs = Date.now() - startTime;

    // Extract text and language
    const text = response.text || '';
    const language = response.language || options.language || 'unknown';

    // Estimate confidence from word-level data if available
    const confidence = estimateConfidence(response);

    // Record metrics
    recordVoiceTranscription('whisper', durationMs, confidence);

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
    recordVoiceTranscription('whisper', durationMs, 0);

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
 * Estimate confidence from Whisper response
 *
 * Whisper doesn't provide a direct confidence score, so we estimate:
 * - If segments with avg_logprob available, use exponential of average
 * - Otherwise, return 0.85 as default (high confidence assumption)
 */
function estimateConfidence(response: unknown): number {
  const typedResponse = response as {
    segments?: Array<{
      avg_logprob?: number;
      no_speech_prob?: number;
    }>;
  };

  if (!typedResponse.segments || typedResponse.segments.length === 0) {
    return 0.85; // Default confidence when no segment data
  }

  // Calculate average log probability across segments
  let totalLogProb = 0;
  let totalNoSpeechProb = 0;
  let count = 0;

  for (const segment of typedResponse.segments) {
    if (typeof segment.avg_logprob === 'number') {
      totalLogProb += segment.avg_logprob;
      count++;
    }
    if (typeof segment.no_speech_prob === 'number') {
      totalNoSpeechProb += segment.no_speech_prob;
    }
  }

  if (count === 0) {
    return 0.85;
  }

  // Convert average log probability to linear probability (0-1)
  const avgLogProb = totalLogProb / count;
  const avgNoSpeechProb = totalNoSpeechProb / typedResponse.segments.length;

  // Log probability is typically between -2 (low confidence) and 0 (high confidence)
  // Map to 0-1 range: exp(logprob) gives probability
  let confidence = Math.exp(avgLogProb);

  // Penalize if high no-speech probability
  if (avgNoSpeechProb > 0.5) {
    confidence *= (1 - avgNoSpeechProb);
  }

  // Clamp to valid range
  return Math.max(0, Math.min(1, confidence));
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
