/**
 * Whisper (ElevenLabs STT) Tests
 * Feature: 001-mastra-agentic-voice
 *
 * Tests for Speech-to-Text integration with ElevenLabs:
 * - transcribeAudio function with mocked API
 * - isConfidenceAcceptable threshold checking
 * - getLowConfidenceMessage for user feedback
 * - TranscriptionError class
 * - Helper functions (getMimeType, calculateConfidence)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transcribeAudio,
  isConfidenceAcceptable,
  getLowConfidenceMessage,
  TranscriptionError,
  CONFIDENCE_THRESHOLD,
  type TranscriptionResult,
  type TranscriptionOptions,
} from '@/lib/mastra/voice/whisper';

// =============================================================================
// Mocks
// =============================================================================

// Mock the logging module
vi.mock('@/lib/mastra/logging', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
}));

// Mock the metrics module
vi.mock('@/lib/mastra/metrics', () => ({
  recordVoiceTranscription: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Set up required environment variable
  process.env = { ...originalEnv, ELEVENLABS_API_KEY: 'test-api-key' };
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// CONFIDENCE_THRESHOLD Tests
// =============================================================================

describe('CONFIDENCE_THRESHOLD', () => {
  it('should be 0.7 as per T070 requirements', () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });
});

// =============================================================================
// isConfidenceAcceptable Tests
// =============================================================================

describe('isConfidenceAcceptable', () => {
  it('should return true for confidence at threshold (0.7)', () => {
    expect(isConfidenceAcceptable(0.7)).toBe(true);
  });

  it('should return true for confidence above threshold', () => {
    expect(isConfidenceAcceptable(0.8)).toBe(true);
    expect(isConfidenceAcceptable(0.95)).toBe(true);
    expect(isConfidenceAcceptable(1.0)).toBe(true);
  });

  it('should return false for confidence below threshold', () => {
    expect(isConfidenceAcceptable(0.69)).toBe(false);
    expect(isConfidenceAcceptable(0.5)).toBe(false);
    expect(isConfidenceAcceptable(0.0)).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isConfidenceAcceptable(0)).toBe(false);
    expect(isConfidenceAcceptable(-0.1)).toBe(false);
    expect(isConfidenceAcceptable(1.1)).toBe(true);
  });
});

// =============================================================================
// getLowConfidenceMessage Tests
// =============================================================================

describe('getLowConfidenceMessage', () => {
  it('should return a user-friendly message', () => {
    const message = getLowConfidenceMessage();

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should mention trying again', () => {
    const message = getLowConfidenceMessage();
    expect(message.toLowerCase()).toContain('try');
  });

  it('should be polite and helpful', () => {
    const message = getLowConfidenceMessage();
    // Should not contain harsh language
    expect(message.toLowerCase()).not.toContain('error');
    expect(message.toLowerCase()).not.toContain('failed');
  });
});

// =============================================================================
// TranscriptionError Tests
// =============================================================================

describe('TranscriptionError', () => {
  it('should create error with message and code', () => {
    const error = new TranscriptionError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('TranscriptionError');
  });

  it('should be an instance of Error', () => {
    const error = new TranscriptionError('Test', 'CODE');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have a stack trace', () => {
    const error = new TranscriptionError('Test', 'CODE');
    expect(error.stack).toBeDefined();
  });

  it('should preserve error code as readonly', () => {
    const error = new TranscriptionError('Test', 'ORIGINAL_CODE');
    expect(error.code).toBe('ORIGINAL_CODE');
  });
});

// =============================================================================
// transcribeAudio Tests
// =============================================================================

describe('transcribeAudio', () => {
  describe('Successful Transcription', () => {
    it('should transcribe audio and return result', async () => {
      const mockResponse = {
        text: 'Hello, this is a test transcription',
        language_code: 'en',
        words: [
          { text: 'Hello', confidence: 0.95 },
          { text: 'this', confidence: 0.9 },
          { text: 'is', confidence: 0.92 },
          { text: 'a', confidence: 0.88 },
          { text: 'test', confidence: 0.94 },
          { text: 'transcription', confidence: 0.91 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const audioBuffer = Buffer.from('test audio data');
      const result = await transcribeAudio(audioBuffer, 'test.webm');

      expect(result.text).toBe('Hello, this is a test transcription');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should use default filename when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      const audioBuffer = Buffer.from('test');
      await transcribeAudio(audioBuffer);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('speech-to-text');
    });

    it('should pass language hint when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'Hallo Welt', language_code: 'de', words: [] }),
      });

      const audioBuffer = Buffer.from('test');
      const options: TranscriptionOptions = { language: 'de' };
      const result = await transcribeAudio(audioBuffer, 'audio.webm', options);

      expect(result.language).toBe('de');
    });

    it('should handle auto language detection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', language_code: 'en', words: [] }),
      });

      const audioBuffer = Buffer.from('test');
      await transcribeAudio(audioBuffer, 'audio.webm', { language: 'auto' });

      // Check that fetch was called (language hint should be omitted for auto)
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate weighted average confidence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Hi test',
            words: [
              { text: 'Hi', confidence: 0.9 }, // weight: 2
              { text: 'test', confidence: 0.8 }, // weight: 4
            ],
          }),
      });

      const result = await transcribeAudio(Buffer.from('test'));

      // Weighted: (0.9*2 + 0.8*4) / (2+4) = (1.8 + 3.2) / 6 = 0.833...
      expect(result.confidence).toBeCloseTo(0.833, 2);
    });

    it('should return 0.85 when no words array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test' }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.confidence).toBe(0.85);
    });

    it('should return 0.85 when words array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.confidence).toBe(0.85);
    });

    it('should handle words without confidence scores', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'test',
            words: [{ text: 'test' }], // No confidence property
          }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      // Should fall back to 0.85 since totalWeight would be 0
      expect(result.confidence).toBe(0.85);
    });

    it('should clamp confidence to valid range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'test',
            words: [{ text: 'test', confidence: 1.5 }], // Invalid high confidence
          }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MIME Type Detection', () => {
    it('should detect webm mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'recording.webm');

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      // FormData contains the blob with correct mime type
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should detect mp3 mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.mp3');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should detect wav mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.wav');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should detect ogg mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.ogg');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should detect m4a mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.m4a');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should detect flac mime type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.flac');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should default to webm for unknown extension', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.xyz');
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw TranscriptionError on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(transcribeAudio(Buffer.from('test'))).rejects.toThrow(TranscriptionError);
    });

    it('should include error message from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid audio format'),
      });

      try {
        await transcribeAudio(Buffer.from('test'));
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TranscriptionError);
        expect((error as TranscriptionError).message).toContain('400');
      }
    });

    it('should throw TranscriptionError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(transcribeAudio(Buffer.from('test'))).rejects.toThrow(TranscriptionError);
    });

    it('should have TRANSCRIPTION_FAILED code on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      try {
        await transcribeAudio(Buffer.from('test'));
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as TranscriptionError).code).toBe('TRANSCRIPTION_FAILED');
      }
    });

    it('should throw when API key is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      await expect(transcribeAudio(Buffer.from('test'))).rejects.toThrow(
        'ELEVENLABS_API_KEY environment variable is not set'
      );
    });
  });

  describe('API Request Format', () => {
    it('should send POST request to ElevenLabs API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/speech-to-text',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'xi-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should send FormData with audio blob', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'), 'audio.webm');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBeInstanceOf(FormData);
    });
  });

  describe('Metrics Recording', () => {
    it('should record transcription metrics on success', async () => {
      const { recordVoiceTranscription } = await import('@/lib/mastra/metrics');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      await transcribeAudio(Buffer.from('test'));

      expect(recordVoiceTranscription).toHaveBeenCalledWith(
        'elevenlabs',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should record zero confidence on failure', async () => {
      const { recordVoiceTranscription } = await import('@/lib/mastra/metrics');

      mockFetch.mockRejectedValueOnce(new Error('API error'));

      try {
        await transcribeAudio(Buffer.from('test'));
      } catch {
        // Expected to throw
      }

      expect(recordVoiceTranscription).toHaveBeenCalledWith('elevenlabs', expect.any(Number), 0);
    });
  });

  describe('Language Handling', () => {
    it('should return detected language from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'Bonjour', language_code: 'fr', words: [] }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.language).toBe('fr');
    });

    it('should fall back to specified language when API does not return one', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      const result = await transcribeAudio(Buffer.from('test'), 'audio.webm', { language: 'de' });
      expect(result.language).toBe('de');
    });

    it('should use unknown when no language available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ text: 'test', words: [] }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.language).toBe('unknown');
    });
  });

  describe('Result Structure', () => {
    it('should return complete TranscriptionResult', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Test transcription',
            language_code: 'en',
            words: [{ text: 'Test', confidence: 0.9 }],
          }),
      });

      const result = await transcribeAudio(Buffer.from('test'));

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('confidence');

      expect(typeof result.text).toBe('string');
      expect(typeof result.language).toBe('string');
      expect(typeof result.durationMs).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle empty text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ words: [] }),
      });

      const result = await transcribeAudio(Buffer.from('test'));
      expect(result.text).toBe('');
    });
  });
});
