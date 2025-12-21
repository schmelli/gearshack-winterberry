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
 */

import { createClient } from '@/lib/supabase/server';
import {
  synthesizeSpeechStream,
  synthesizeSpeech,
  getContentType,
  isCacheablePhrase,
  getCachedAudio,
  cacheAudio,
  type TTSVoice,
  type TTSModel,
  type TTSFormat,
} from '@/lib/mastra/voice/tts';
import { logInfo, logError, logWarn } from '@/lib/mastra/logging';
import { checkRateLimit } from '@/lib/mastra/rate-limiter';

export const runtime = 'nodejs';

// =====================================================
// Request Validation
// =====================================================

interface SynthesisRequest {
  text: string;
  voice?: TTSVoice;
  model?: TTSModel;
  format?: TTSFormat;
  speed?: number;
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

  // Validate text length (max 4096 characters for OpenAI TTS)
  if (request.text.length > 4096) {
    return { valid: false, error: 'text must not exceed 4096 characters' };
  }

  // Validate voice if provided
  const validVoices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  if (request.voice !== undefined && !validVoices.includes(request.voice as TTSVoice)) {
    return { valid: false, error: `voice must be one of: ${validVoices.join(', ')}` };
  }

  // Validate model if provided
  const validModels: TTSModel[] = ['tts-1', 'tts-1-hd'];
  if (request.model !== undefined && !validModels.includes(request.model as TTSModel)) {
    return { valid: false, error: `model must be one of: ${validModels.join(', ')}` };
  }

  // Validate format if provided
  const validFormats: TTSFormat[] = ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
  if (request.format !== undefined && !validFormats.includes(request.format as TTSFormat)) {
    return { valid: false, error: `format must be one of: ${validFormats.join(', ')}` };
  }

  // Validate speed if provided
  if (request.speed !== undefined) {
    const speed = Number(request.speed);
    if (isNaN(speed) || speed < 0.25 || speed > 4.0) {
      return { valid: false, error: 'speed must be a number between 0.25 and 4.0' };
    }
  }

  return {
    valid: true,
    data: {
      text: request.text.trim(),
      voice: request.voice as TTSVoice | undefined,
      model: request.model as TTSModel | undefined,
      format: request.format as TTSFormat | undefined,
      speed: request.speed as number | undefined,
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
 * Synthesize speech from text using OpenAI TTS.
 *
 * Request:
 *   - text: Text to synthesize (required, max 4096 chars)
 *   - voice: Voice to use (optional, default: 'nova')
 *   - model: Model to use (optional, default: 'tts-1')
 *   - format: Output format (optional, default: 'mp3')
 *   - speed: Playback speed 0.25-4.0 (optional, default: 1.0)
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

    // Check rate limit (voice tier)
    const rateLimitResult = await checkRateLimit(
      supabase as unknown as import('@supabase/supabase-js').SupabaseClient,
      user.id,
      'voice'
    );

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

    const { text, voice = 'nova', model = 'tts-1', format = 'mp3', speed = 1.0, stream = true } = validation.data;

    logInfo('Starting voice synthesis', {
      userId: user.id,
      metadata: {
        textLength: text.length,
        voice,
        model,
        format,
        speed,
        stream,
      },
    });

    // Check cache for common phrases (T081)
    if (isCacheablePhrase(text)) {
      const cachedAudio = getCachedAudio(text, voice);
      if (cachedAudio) {
        logInfo('Returning cached TTS audio', {
          userId: user.id,
          metadata: { textLength: text.length, voice },
        });

        return new Response(cachedAudio, {
          status: 200,
          headers: {
            'Content-Type': getContentType(format),
            'X-Cache': 'HIT',
            'Cache-Control': 'private, max-age=86400',
          },
        });
      }
    }

    // Synthesize audio
    if (stream) {
      // Streaming response (T075)
      const audioStream = await synthesizeSpeechStream(text, {
        voice,
        model,
        format,
        speed,
      });

      return new Response(audioStream, {
        status: 200,
        headers: {
          'Content-Type': getContentType(format),
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Cache': 'MISS',
        },
      });
    } else {
      // Buffered response (for caching)
      const result = await synthesizeSpeech(text, {
        voice,
        model,
        format,
        speed,
      });

      // Cache if this is a common phrase (T081)
      if (isCacheablePhrase(text)) {
        cacheAudio(text, result.audio, voice, format);
      }

      logInfo('Voice synthesis completed', {
        userId: user.id,
        metadata: {
          textLength: text.length,
          audioSize: result.audio.length,
          durationMs: result.durationMs,
        },
      });

      return new Response(result.audio, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Content-Length': String(result.audio.length),
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logError('Synthesis endpoint error', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({
        error: 'Synthesis failed',
        message: errorMessage,
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
