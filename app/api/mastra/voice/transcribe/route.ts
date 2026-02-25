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
import { checkAndIncrementRateLimit } from '@/lib/mastra/rate-limiter';
import { fileTypeFromBuffer } from 'file-type';

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

    // Early file size check via Content-Length header (before reading body into memory)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const contentLength = request.headers.get('content-length');
    const parsedContentLength = contentLength ? parseInt(contentLength, 10) : 0;
    if (Number.isFinite(parsedContentLength) && parsedContentLength > MAX_FILE_SIZE) {
      logWarn('Audio file too large (Content-Length check)', {
        userId: user.id,
        metadata: { contentLength: parsedContentLength, maxSize: MAX_FILE_SIZE },
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
        JSON.stringify({
          error: 'Missing audio file',
          message: 'Please provide an audio file to transcribe.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate audio file type (prevent processing of non-audio files)
    const ALLOWED_AUDIO_TYPES = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/flac',
    ];
    if (audioFile.type && !ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      logWarn('Invalid audio file type (MIME)', {
        userId: user.id,
        metadata: { mimeType: audioFile.type, fileName: audioFile.name },
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid audio format',
          message: 'Supported formats: WebM, WAV, MP3, M4A, OGG, FLAC',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Magic byte validation to prevent MIME type spoofing
    // Client-provided MIME types can be forged, so we validate actual file content
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    const detectedType = await fileTypeFromBuffer(fileBuffer);

    // Map of allowed file extensions to their corresponding MIME types
    const ALLOWED_EXTENSIONS = ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg', 'flac'];

    if (!detectedType || !ALLOWED_EXTENSIONS.includes(detectedType.ext)) {
      logWarn('Invalid audio file (magic byte validation failed)', {
        userId: user.id,
        metadata: {
          declaredMime: audioFile.type,
          detectedMime: detectedType?.mime || 'unknown',
          detectedExt: detectedType?.ext || 'unknown',
          fileName: audioFile.name,
        },
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid audio file',
          message: 'File content does not match an audio format. Supported: WebM, WAV, MP3, M4A, OGG, FLAC',
        }),
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
        detectedMime: detectedType.mime,
        language: languageHint,
      },
    });

    // Use the buffer we already created for magic byte validation
    const buffer = fileBuffer;

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
