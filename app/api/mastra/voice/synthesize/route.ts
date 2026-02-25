/**
 * Voice Synthesis API Route
 * Feature: 001-mastra-agentic-voice
 * Task: T073 - Create TTS API route
 * Task: T075 - Implement streaming TTS
 * Task: T081 - Add TTS response caching
 *
 * POST /api/mastra/voice/synthesize
 *   - Accepts text and voice options
 *   - Returns streaming audio (mp3)
 *   - Caches common phrases for faster responses
 *
 * Uses Mastra Voice adapter for provider-independent TTS pipeline.
 * @see lib/mastra/voice/mastra-voice-adapter.ts
 */

import { Readable } from 'node:stream';
import { createClient } from '@/lib/supabase/server';
import { getContentType, isCacheablePhrase, getCachedAudio, VOICE_IDS, type TTSVoice, type TTSModel, type TTSFormat } from '@/lib/mastra/voice/tts';
import { getVoiceInstance } from '@/lib/mastra/voice/mastra-voice-adapter';
import { logInfo, logError, logWarn } from '@/lib/mastra/logging';
import { checkAndIncrementRateLimit } from '@/lib/mastra/rate-limiter';

export const runtime = 'nodejs';

// =====================================================
// Request Validation
// =====================================================

interface SynthesisRequest {
  text: string;
  voice?: TTSVoice;
  model?: TTSModel;
  format?: TTSFormat;
  stability?: number;
  similarityBoost?: number;
  stream?: boolean;
}

function validateRequest(body: unknown): {
  valid: true;
  data: SynthesisRequest;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  // Text is required
  if (typeof request.text !== 'string' || request.text.trim() === '') {
    return { valid: false, error: 'text is required and must be a non-empty string' };
  }

  // Validate text length (max 5000 characters for ElevenLabs TTS)
  if (request.text.length > 5000) {
    return { valid: false, error: 'text must not exceed 5000 characters' };
  }

  // Validate voice if provided — derived from VOICE_IDS to stay in sync with tts.ts
  const validVoices = Object.keys(VOICE_IDS) as TTSVoice[];
  if (request.voice !== undefined && !validVoices.includes(request.voice as TTSVoice)) {
    return { valid: false, error: `voice must be one of: ${validVoices.join(', ')}` };
  }

  // Validate model if provided (ElevenLabs models)
  const validModels: TTSModel[] = ['eleven_turbo_v2_5', 'eleven_multilingual_v2'];
  if (request.model !== undefined && !validModels.includes(request.model as TTSModel)) {
    return { valid: false, error: `model must be one of: ${validModels.join(', ')}` };
  }

  // Validate format if provided (ElevenLabs formats)
  const validFormats: TTSFormat[] = ['mp3_44100_128', 'mp3_22050_32', 'pcm_16000', 'pcm_22050', 'pcm_24000'];
  if (request.format !== undefined && !validFormats.includes(request.format as TTSFormat)) {
    return { valid: false, error: `format must be one of: ${validFormats.join(', ')}` };
  }

  // Validate stability if provided (0.0 - 1.0)
  if (request.stability !== undefined) {
    const stability = Number(request.stability);
    if (!Number.isFinite(stability) || stability < 0 || stability > 1) {
      return { valid: false, error: 'stability must be a number between 0.0 and 1.0' };
    }
  }

  // Validate similarityBoost if provided (0.0 - 1.0)
  if (request.similarityBoost !== undefined) {
    const similarityBoost = Number(request.similarityBoost);
    if (!Number.isFinite(similarityBoost) || similarityBoost < 0 || similarityBoost > 1) {
      return { valid: false, error: 'similarityBoost must be a number between 0.0 and 1.0' };
    }
  }

  return {
    valid: true,
    data: {
      text: request.text.trim(),
      voice: request.voice as TTSVoice | undefined,
      model: request.model as TTSModel | undefined,
      format: request.format as TTSFormat | undefined,
      stability: request.stability as number | undefined,
      similarityBoost: request.similarityBoost as number | undefined,
      stream: request.stream !== false, // Default to streaming
    },
  };
}

// =====================================================
// POST Handler
// =====================================================

/**
 * POST /api/mastra/voice/synthesize
 *
 * Synthesize speech from text using ElevenLabs TTS via the Mastra Voice adapter.
 *
 * Request:
 *   - text: Text to synthesize (required, max 5000 chars)
 *   - voice: ElevenLabs voice name (optional, default: 'rachel')
 *   - model: ElevenLabs model (optional, default: 'eleven_turbo_v2_5')
 *   - format: Audio format (optional, default: 'mp3_44100_128')
 *   - stability: Voice stability 0.0–1.0 (optional, default: 0.5)
 *   - similarityBoost: Similarity boost 0.0–1.0 (optional, default: 0.75)
 *   - stream: Enable streaming (optional, default: true)
 *
 * Response:
 *   - 200: Audio stream (streaming) or audio buffer (non-streaming)
 *   - 400: Invalid request
 *   - 401: Unauthorized
 *   - 429: Rate limit exceeded
 *   - 500: Synthesis failed
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logWarn('Unauthorized synthesis attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (voice tier) - atomically check and increment
    const rateLimitResult = await checkAndIncrementRateLimit(user.id, 'voice');

    if (!rateLimitResult.allowed) {
      logWarn('Voice rate limit exceeded', {
        userId: user.id,
        metadata: { remaining: rateLimitResult.remaining },
      });

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'You have reached your voice interaction limit. Please wait before trying again.',
          resetAt: rateLimitResult.resetAt?.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(
              rateLimitResult.resetAt
                ? Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
                : 60
            ),
          },
        }
      );
    }

    // Parse and validate request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      text,
      voice = 'rachel',
      model = 'eleven_turbo_v2_5',
      format = 'mp3_44100_128',
      stability = 0.5,
      similarityBoost = 0.75,
      stream = true,
    } = validation.data;

    logInfo('Starting voice synthesis', {
      userId: user.id,
      metadata: {
        textLength: text.length,
        voice,
        model,
        format,
        stream,
      },
    });

    // Use Mastra Voice pipeline (provider-independent TTS)
    const voiceAdapter = getVoiceInstance();

    if (stream) {
      // Determine cache status BEFORE calling speak() so we can set X-Cache accurately.
      // speak() itself also checks the cache; this in-memory double-check is negligible.
      const isCached = isCacheablePhrase(text) && getCachedAudio(text, voice, format) !== null;

      // Streaming response via Mastra Voice speak() — cache reads handled internally
      const audioStream = await voiceAdapter.speak(text, {
        speaker: voice,
        model,
        format,
        stability,
        similarityBoost,
      });

      // Convert Node.js Readable to Web ReadableStream for Response
      const webStream = Readable.toWeb(audioStream as Readable);

      return new Response(webStream as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': getContentType(format),
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Cache': isCached ? 'HIT' : 'MISS',
        },
      });
    } else {
      // Buffered response via Mastra Voice speakBuffered() — caches common phrases
      const result = await voiceAdapter.speakBuffered(text, {
        speaker: voice,
        model,
        format,
        stability,
        similarityBoost,
      });

      // durationMs === 0 signals a cache hit (see speakBuffered JSDoc)
      const isCached = result.durationMs === 0;

      logInfo('Voice synthesis completed', {
        userId: user.id,
        metadata: {
          textLength: text.length,
          audioSize: result.audio.length,
          durationMs: result.durationMs,
          cacheHit: isCached,
        },
      });

      // Cast Buffer to BodyInit for Response compatibility (Buffer extends Uint8Array in Node.js)
      return new Response(result.audio as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Content-Length': String(result.audio.length),
          'X-Cache': isCached ? 'HIT' : 'MISS',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  } catch (error) {
    // Log detailed error internally but don't expose to client
    logError('Synthesis endpoint error', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({
        error: 'Synthesis failed',
        // Don't expose internal error details to clients
        message: 'Unable to synthesize speech. Please try again later.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// Unsupported Methods
// =====================================================

export function GET(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
}
