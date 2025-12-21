/**
 * Voice Transcription API Route
 * Feature: 001-mastra-agentic-voice
 * Task: T069 - Create transcription API route
 * Task: T070 - Add transcription confidence check
 *
 * POST /api/mastra/voice/transcribe
 *   - Accepts audio file via FormData
 *   - Returns transcription with confidence score
 *   - Suggests retry if confidence below threshold (70%)
 */

import { createClient } from '@/lib/supabase/server';
import {
  transcribeAudio,
  isConfidenceAcceptable,
  getLowConfidenceMessage,
  CONFIDENCE_THRESHOLD,
  type TranscriptionLanguage,
} from '@/lib/mastra/voice/whisper';
import { logInfo, logError, logWarn } from '@/lib/mastra/logging';
import { checkRateLimit } from '@/lib/mastra/rate-limiter';

export const runtime = 'nodejs';

// =====================================================
// Types
// =====================================================

interface TranscriptionResponse {
  success: boolean;
  text: string;
  language: string;
  confidence: number;
  durationMs: number;
  needsRetry: boolean;
  retryMessage?: string;
}

// =====================================================
// POST Handler
// =====================================================

/**
 * POST /api/mastra/voice/transcribe
 *
 * Transcribe audio to text using OpenAI Whisper.
 *
 * Request:
 *   - Content-Type: multipart/form-data
 *   - audio: Audio file (webm, mp3, wav, etc.)
 *   - language (optional): Language hint ('en', 'de', 'auto')
 *
 * Response:
 *   - 200: Transcription result with confidence
 *   - 400: Invalid request (missing audio)
 *   - 401: Unauthorized
 *   - 429: Rate limit exceeded
 *   - 500: Transcription failed
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
      logWarn('Unauthorized transcription attempt');
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

    // Early file size check via Content-Length header (before reading body into memory)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      logWarn('Audio file too large (Content-Length check)', {
        userId: user.id,
        metadata: { contentLength: parseInt(contentLength, 10), maxSize: MAX_FILE_SIZE },
      });
      return new Response(
        JSON.stringify({
          error: 'Audio file too large',
          message: 'Maximum file size is 25MB.',
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const languageHint = formData.get('language') as string | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate actual file size (backup check - Content-Length may be missing or incorrect)
    if (audioFile.size > MAX_FILE_SIZE) {
      logWarn('Audio file too large (file size check)', {
        userId: user.id,
        metadata: { fileSize: audioFile.size, maxSize: MAX_FILE_SIZE },
      });
      return new Response(
        JSON.stringify({
          error: 'Audio file too large',
          message: 'Maximum file size is 25MB.',
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logInfo('Starting voice transcription', {
      userId: user.id,
      metadata: {
        fileSize: audioFile.size,
        fileName: audioFile.name,
        mimeType: audioFile.type,
        language: languageHint,
      },
    });

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine language
    let language: TranscriptionLanguage = 'auto';
    if (languageHint === 'en' || languageHint === 'de') {
      language = languageHint;
    }

    // Transcribe audio
    const result = await transcribeAudio(buffer, audioFile.name, { language });

    // Check confidence threshold (T070)
    const needsRetry = !isConfidenceAcceptable(result.confidence);

    const response: TranscriptionResponse = {
      success: true,
      text: result.text,
      language: result.language,
      confidence: result.confidence,
      durationMs: result.durationMs,
      needsRetry,
    };

    // Add retry message if confidence is low
    if (needsRetry) {
      response.retryMessage = getLowConfidenceMessage();

      logWarn('Low confidence transcription', {
        userId: user.id,
        metadata: {
          confidence: result.confidence,
          threshold: CONFIDENCE_THRESHOLD,
          textLength: result.text.length,
        },
      });
    }

    logInfo('Voice transcription completed', {
      userId: user.id,
      metadata: {
        textLength: result.text.length,
        confidence: result.confidence,
        durationMs: result.durationMs,
        needsRetry,
      },
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logError('Transcription endpoint error', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({
        error: 'Transcription failed',
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
