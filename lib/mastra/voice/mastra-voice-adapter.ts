/**
 * Mastra Voice Adapter for ElevenLabs
 * Feature: Mastra Voice API Integration
 *
 * Implements Mastra's MastraVoice abstract class using ElevenLabs for
 * both TTS (speak) and STT (listen). This adapter enables:
 * - Provider-independent voice pipeline via Mastra's abstraction
 * - Easy provider switching (ElevenLabs -> OpenAI -> etc.)
 * - Integration with Mastra Agent's voice property (agent.getVoice())
 * - Future speech-to-speech support when Mastra adds native support
 *
 * @see https://mastra.ai/reference/voice/mastra-voice
 * @see https://mastra.ai/docs/agents/adding-voice
 */

import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { MastraVoice } from '@mastra/core/voice';
import {
  synthesizeSpeechStream,
  synthesizeSpeech,
  isCacheablePhrase,
  getCachedAudio,
  cacheAudio,
  getContentType,
  VOICE_OPTIONS,
  VOICE_IDS,
  type TTSVoice,
  type TTSModel,
  type TTSFormat,
  type SynthesisResult,
} from './tts';
import {
  transcribeAudio,
  isConfidenceAcceptable,
  getLowConfidenceMessage,
  type TranscriptionLanguage,
  type TranscriptionResult,
} from './whisper';
import { logDebug } from '../logging';

// ============================================================================
// Types
// ============================================================================

/** Configuration for the GearshackElevenLabsVoice adapter */
export interface GearshackVoiceConfig {
  /** Default TTS voice (default: 'rachel') */
  defaultVoice?: TTSVoice;
  /** Default TTS model (default: 'eleven_turbo_v2_5') */
  defaultModel?: TTSModel;
  /** Default audio format (default: 'mp3_44100_128') */
  defaultFormat?: TTSFormat;
  /** Default language for STT (default: 'auto') */
  language?: TranscriptionLanguage;
  /** Voice stability 0.0-1.0 (default: 0.5) */
  stability?: number;
  /** Similarity boost 0.0-1.0 (default: 0.75) */
  similarityBoost?: number;
}

/** Extended speak options beyond MastraVoice's standard interface */
export interface GearshackSpeakOptions {
  speaker?: string;
  model?: TTSModel;
  format?: TTSFormat;
  stability?: number;
  similarityBoost?: number;
}

/** Extended listen options beyond MastraVoice's standard interface */
export interface GearshackListenOptions {
  language?: TranscriptionLanguage;
  filename?: string;
}

/** Extended transcription result with confidence metadata */
export interface ExtendedTranscriptionResult extends TranscriptionResult {
  needsRetry: boolean;
  retryMessage?: string;
}

// ============================================================================
// Resolved config type (all fields required with defaults applied)
// ============================================================================

interface ResolvedVoiceConfig {
  defaultVoice: TTSVoice;
  defaultModel: TTSModel;
  defaultFormat: TTSFormat;
  language: TranscriptionLanguage;
  stability: number;
  similarityBoost: number;
}

// ============================================================================
// Mastra Voice Adapter
// ============================================================================

/**
 * Gearshack ElevenLabs Voice Adapter
 *
 * Implements Mastra's MastraVoice interface using ElevenLabs for both
 * TTS and STT. Preserves all existing functionality:
 * - TTS response caching for common phrases
 * - Streaming and buffered synthesis modes
 * - Confidence-based transcription quality checks
 * - Prometheus metrics recording
 * - Structured logging
 *
 * Usage with Mastra Agent:
 * ```typescript
 * const agent = new Agent({
 *   voice: new GearshackElevenLabsVoice({ defaultVoice: 'rachel' }),
 *   // ...
 * });
 * const voice = agent.getVoice();
 * const audio = await voice.speak('Hello!');
 * const text = await voice.listen(audioStream);
 * ```
 *
 * Standalone usage:
 * ```typescript
 * const voice = createGearshackVoice();
 * const audio = await voice.speak('Hello!');
 * const result = await voice.listenWithMetadata(audioBuffer, { language: 'en' });
 * ```
 */
export class GearshackElevenLabsVoice extends MastraVoice {
  private voiceConfig: ResolvedVoiceConfig;

  constructor(config: GearshackVoiceConfig = {}) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ELEVENLABS_API_KEY is not set. GearshackElevenLabsVoice cannot be initialized. ' +
        'Please add ELEVENLABS_API_KEY to your environment variables.'
      );
    }
    super({
      speechModel: {
        name: config.defaultModel ?? 'eleven_turbo_v2_5',
        apiKey,
      },
      listeningModel: {
        name: 'elevenlabs-stt',
        apiKey,
      },
      speaker: config.defaultVoice ?? 'rachel',
    });

    this.voiceConfig = {
      defaultVoice: config.defaultVoice ?? 'rachel',
      defaultModel: config.defaultModel ?? 'eleven_turbo_v2_5',
      defaultFormat: config.defaultFormat ?? 'mp3_44100_128',
      language: config.language ?? 'auto',
      stability: config.stability ?? 0.5,
      similarityBoost: config.similarityBoost ?? 0.75,
    };
  }

  // ========================================================================
  // MastraVoice Interface: speak()
  // ========================================================================

  /**
   * Convert text to speech using ElevenLabs TTS.
   *
   * Returns a Node.js ReadableStream of audio data.
   * Automatically checks cache for common phrases.
   *
   * This method satisfies MastraVoice's interface. For typed access to
   * provider-specific options (model, format, stability, similarityBoost),
   * cast `options` to {@link GearshackSpeakOptions} or use {@link speakBuffered}.
   *
   * @param input - Text string or stream to synthesize
   * @param options - Optional speaker and synthesis settings (see {@link GearshackSpeakOptions})
   * @returns Audio stream
   */
  async speak(
    input: string | NodeJS.ReadableStream,
    options?: { speaker?: string; [key: string]: unknown }
  ): Promise<NodeJS.ReadableStream> {
    const text = typeof input === 'string' ? input : await this.streamToString(input);

    const voice = this.resolveVoice(options?.speaker);
    const model = (options?.model as TTSModel) ?? this.voiceConfig.defaultModel;
    const format = (options?.format as TTSFormat) ?? this.voiceConfig.defaultFormat;
    const stability = typeof options?.stability === 'number'
      ? options.stability
      : this.voiceConfig.stability;
    const similarityBoost = typeof options?.similarityBoost === 'number'
      ? options.similarityBoost
      : this.voiceConfig.similarityBoost;

    logDebug('Mastra Voice speak()', {
      metadata: { textLength: text.length, voice, model },
    });

    // Check TTS cache for common phrases (keyed by voice + format + text)
    if (isCacheablePhrase(text)) {
      const cached = getCachedAudio(text, voice, format);
      if (cached) {
        logDebug('Mastra Voice speak() cache hit', {
          metadata: { textLength: text.length, voice, format },
        });
        return Readable.from(cached);
      }
    }

    // Synthesize via ElevenLabs streaming API
    const webStream = await synthesizeSpeechStream(text, {
      voice,
      model,
      format,
      stability,
      similarityBoost,
    });

    // Convert Web ReadableStream to Node.js Readable
    return Readable.fromWeb(webStream as WebReadableStream);
  }

  // ========================================================================
  // MastraVoice Interface: listen()
  // ========================================================================

  /**
   * Convert speech to text using ElevenLabs STT.
   *
   * @param audioStream - Audio data as Node.js ReadableStream
   * @param options - Optional language and filename hints
   * @returns Transcribed text string
   */
  async listen(
    audioStream: NodeJS.ReadableStream,
    options?: { [key: string]: unknown }
  ): Promise<string> {
    const result = await this.listenWithMetadata(audioStream, {
      language: (options?.language as TranscriptionLanguage) ?? this.voiceConfig.language,
      filename: (options?.filename as string) ?? 'audio.webm',
    });
    return result.text;
  }

  // ========================================================================
  // MastraVoice Interface: getSpeakers()
  // ========================================================================

  /**
   * Get available ElevenLabs voices.
   *
   * @returns Array of voice options with voiceId, name, and description
   */
  async getSpeakers(): Promise<Array<{ voiceId: string; [key: string]: unknown }>> {
    return VOICE_OPTIONS.map((v) => ({
      voiceId: VOICE_IDS[v.value],
      name: v.label,
      shortName: v.value,
      description: v.description,
    }));
  }

  // ========================================================================
  // Extended Methods (beyond MastraVoice interface)
  // ========================================================================

  /**
   * Transcribe audio with full metadata (confidence, language, timing).
   *
   * Use this when you need the full transcription result including
   * confidence scores and retry suggestions.
   *
   * @param audioInput - Audio data as Node.js ReadableStream or Buffer
   * @param options - Language and filename hints
   * @returns Full transcription result with confidence metadata
   */
  async listenWithMetadata(
    audioInput: NodeJS.ReadableStream | Buffer,
    options: GearshackListenOptions = {}
  ): Promise<ExtendedTranscriptionResult> {
    const buffer = Buffer.isBuffer(audioInput)
      ? audioInput
      : await this.streamToBuffer(audioInput);

    const language = options.language ?? this.voiceConfig.language;
    const filename = options.filename ?? 'audio.webm';

    const result = await transcribeAudio(buffer, filename, { language });

    const needsRetry = !isConfidenceAcceptable(result.confidence);
    return {
      ...result,
      needsRetry,
      retryMessage: needsRetry ? getLowConfidenceMessage() : undefined,
    };
  }

  /**
   * Synthesize speech as a complete buffer (non-streaming).
   *
   * Use this for non-streaming synthesis, e.g., for caching
   * or when you need the complete audio before responding.
   *
   * @param text - Text to synthesize
   * @param options - Voice, model, format, and quality settings
   * @returns Complete synthesis result with audio buffer
   */
  async speakBuffered(
    text: string,
    options: Partial<GearshackSpeakOptions> = {}
  ): Promise<SynthesisResult> {
    const voice = this.resolveVoice(options.speaker);
    const format = options.format ?? this.voiceConfig.defaultFormat;
    const model = options.model ?? this.voiceConfig.defaultModel;
    const stability = options.stability ?? this.voiceConfig.stability;
    const similarityBoost = options.similarityBoost ?? this.voiceConfig.similarityBoost;

    // Check TTS cache for common phrases — keyed by voice + format + text
    // to prevent cross-format cache hits (e.g. MP3 data with audio/pcm header)
    if (isCacheablePhrase(text)) {
      const cached = getCachedAudio(text, voice, format);
      if (cached) {
        logDebug('Mastra Voice speakBuffered() cache hit', {
          metadata: { textLength: text.length, voice, format },
        });
        return {
          audio: cached,
          format,
          contentType: getContentType(format),
          durationMs: 0,
        };
      }
    }

    const result = await synthesizeSpeech(text, {
      voice,
      model,
      format,
      stability,
      similarityBoost,
    });

    // Cache common phrases for future requests
    if (isCacheablePhrase(text)) {
      cacheAudio(text, result.audio, voice, format);
    }

    return result;
  }

  /**
   * Get the resolved configuration for this voice adapter.
   * Useful for inspecting current defaults.
   */
  getConfig(): Readonly<ResolvedVoiceConfig> {
    return { ...this.voiceConfig };
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /** Resolve speaker name/ID to a TTSVoice type */
  private resolveVoice(speaker?: string): TTSVoice {
    if (!speaker) return this.voiceConfig.defaultVoice;

    // Derive valid voices from VOICE_IDS — single source of truth
    const validVoices = Object.keys(VOICE_IDS) as TTSVoice[];
    if (validVoices.includes(speaker as TTSVoice)) {
      return speaker as TTSVoice;
    }

    // Check if it's a voice ID, resolve to name
    for (const [name, id] of Object.entries(VOICE_IDS)) {
      if (id === speaker) return name as TTSVoice;
    }

    return this.voiceConfig.defaultVoice;
  }

  /** Collect a readable stream into a Buffer */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf-8'));
      } else {
        throw new Error(`Unsupported chunk type in stream: ${typeof chunk}`);
      }
    }
    return Buffer.concat(chunks);
  }

  /** Read a readable stream into a string */
  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const buffer = await this.streamToBuffer(stream);
    return buffer.toString('utf-8');
  }
}

// ============================================================================
// Factory & Singleton
// ============================================================================

/** Lazy-loaded singleton voice instance */
let voiceInstance: GearshackElevenLabsVoice | null = null;

/**
 * Create a new GearshackElevenLabsVoice instance.
 *
 * @param config - Voice configuration overrides
 * @returns New voice adapter instance
 */
export function createGearshackVoice(
  config: GearshackVoiceConfig = {}
): GearshackElevenLabsVoice {
  return new GearshackElevenLabsVoice(config);
}

/**
 * Get the shared voice adapter instance (lazy-initialized singleton).
 *
 * Use this in API routes that don't need per-request configuration.
 * The agent creates its own instance via the constructor.
 */
export function getVoiceInstance(): GearshackElevenLabsVoice {
  if (!voiceInstance) {
    voiceInstance = new GearshackElevenLabsVoice();
  }
  return voiceInstance;
}
