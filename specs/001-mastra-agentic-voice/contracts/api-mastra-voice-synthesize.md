# API Contract: Voice Synthesis Endpoint

**Endpoint**: `POST /api/mastra/voice/synthesize`
**Version**: 1.0.0
**Created**: 2025-12-20

---

## Overview

Converts AI text responses to natural-sounding speech using OpenAI TTS for voice-enabled interactions.

---

## Request

### HTTP Method
`POST`

### URL
```
/api/mastra/voice/synthesize
```

### Headers

| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `Content-Type` | Yes | `application/json` | Request body format |
| `Authorization` | Yes | `Bearer <token>` | Supabase Auth JWT |

### Authentication

**Required**: Yes

Uses existing Supabase authentication. The JWT token must be valid and contain a `user_id` claim.

**Unauthorized Response**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```
Status: `401 Unauthorized`

---

### Request Body Schema

```typescript
interface SynthesisRequest {
  text: string;                 // Text to synthesize (1-4096 chars)
  voice?: string;               // Voice ID (default: 'alloy')
  options?: {
    model?: string;             // TTS model (default: 'tts-1')
    speed?: number;             // 0.25-4.0 (default: 1.0)
    format?: string;            // Audio format (default: 'mp3')
  };
}
```

### Voice Options

| Voice ID | Gender | Tone | Use Case |
|----------|--------|------|----------|
| `alloy` | Neutral | Balanced | Default, friendly assistant |
| `echo` | Male | Deep | Authoritative responses |
| `fable` | Female | Warm | Conversational, casual |
| `onyx` | Male | Rich | Professional, serious |
| `nova` | Female | Bright | Energetic, enthusiastic |
| `shimmer` | Female | Soft | Calm, soothing |

### TTS Model Options

| Model | Quality | Latency | Use Case |
|-------|---------|---------|----------|
| `tts-1` | Standard | Low (~1s) | Real-time voice interactions |
| `tts-1-hd` | High | Medium (~3s) | Podcast-quality responses |

### Audio Format Options

| Format | MIME Type | Quality | Size |
|--------|-----------|---------|------|
| `mp3` | `audio/mpeg` | Standard | Smallest |
| `opus` | `audio/opus` | High | Medium |
| `aac` | `audio/aac` | High | Medium |
| `flac` | `audio/flac` | Lossless | Largest |

### Example Request

```json
{
  "text": "Your lightest tent is the Nemo Hornet Elite at 850 grams.",
  "voice": "alloy",
  "options": {
    "model": "tts-1",
    "speed": 1.0,
    "format": "mp3"
  }
}
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `text` | Required, 1-4096 chars | "Text must be between 1 and 4096 characters" |
| `voice` | Optional, valid voice ID | "Invalid voice. Supported: alloy, echo, fable, onyx, nova, shimmer" |
| `options.speed` | Optional, 0.25-4.0 | "Speed must be between 0.25 and 4.0" |
| `options.format` | Optional, valid format | "Invalid format. Supported: mp3, opus, aac, flac" |

---

## Response

### Success Response

**Status**: `200 OK`

**Content-Type**: `audio/mpeg` (or specified format)

**Body**: Binary audio stream

### Response Headers

```
Content-Type: audio/mpeg
Content-Length: 24576
X-Audio-Duration: 4.2
X-Processing-Time-Ms: 1234
X-Voice-Used: alloy
X-Model-Used: tts-1
```

### Alternative JSON Response (for metadata)

Set request header `Accept: application/json` to receive:

```json
{
  "audioUrl": "https://tmp-storage.gearshack.app/tts/abc123.mp3",
  "duration": 4.2,
  "format": "mp3",
  "metadata": {
    "voice": "alloy",
    "model": "tts-1",
    "speed": 1.0,
    "processingTimeMs": 1234,
    "audioSizeBytes": 24576
  }
}
```

**Note**: Temporary audio URL expires after 1 hour.

---

## Rate Limiting

### Voice Operation Limits

| Tier | Limit | Window | Notes |
|------|-------|--------|-------|
| Voice (Transcription + TTS) | 40 requests/hour | 3600s | Combined with `/api/mastra/voice/transcribe` |

### Rate Limit Exceeded Response

**Status**: `429 Too Many Requests`

**Headers**:
```
Retry-After: 2456
X-RateLimit-Limit: 40
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735646400
```

**Body**:
```json
{
  "error": "RateLimitExceeded",
  "message": "Voice requests limited to 40 per hour. Try again in 41 minutes.",
  "operationType": "voice",
  "retryAfter": 2456,
  "resetAt": "2025-12-20T15:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request

**Missing text**:
```json
{
  "error": "ValidationError",
  "message": "Text is required",
  "field": "text"
}
```

**Text too long**:
```json
{
  "error": "ValidationError",
  "message": "Text exceeds maximum length of 4096 characters",
  "field": "text",
  "maxLength": 4096
}
```

**Invalid voice**:
```json
{
  "error": "ValidationError",
  "message": "Invalid voice. Supported voices: alloy, echo, fable, onyx, nova, shimmer",
  "field": "voice"
}
```

### 401 Unauthorized

**Missing or invalid auth token**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```

### 500 Internal Server Error

**TTS API failure**:
```json
{
  "error": "SynthesisFailed",
  "message": "Failed to synthesize audio. Please try again.",
  "details": "OpenAI TTS API timeout after 30s"
}
```

### 503 Service Unavailable

**TTS service down**:
```json
{
  "error": "ServiceUnavailable",
  "message": "Voice synthesis temporarily unavailable. Text-only mode active.",
  "estimatedRecoveryTime": "2025-12-20T15:30:00Z"
}
```

---

## Performance Targets

| Metric | Target | P99 |
|--------|--------|-----|
| **Synthesis Latency (tts-1)** | < 1.5s | < 3s |
| **Synthesis Latency (tts-1-hd)** | < 3s | < 6s |
| **Audio Quality (MOS)** | > 4.0 | > 3.5 |
| **Voice Naturalness** | > 85% | > 75% |

**MOS**: Mean Opinion Score (1.0 = poor, 5.0 = excellent)

---

## Observability

### Structured Logging

**Synthesis Request Log** (JSON format):
```json
{
  "timestamp": "2025-12-20T14:30:00.123Z",
  "level": "info",
  "service": "mastra-voice-synthesize",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "synthesis_completed",
  "metadata": {
    "textLength": 58,
    "voice": "alloy",
    "model": "tts-1",
    "speed": 1.0,
    "format": "mp3",
    "audioDurationSeconds": 4.2,
    "audioSizeBytes": 24576,
    "processingTimeMs": 1234
  }
}
```

### Metrics Exported

**Prometheus Format** (via `/api/mastra/metrics`):
```
mastra_voice_synthesis_total{model="tts-1"} 389
mastra_voice_synthesis_total{model="tts-1-hd"} 67
mastra_voice_synthesis_latency_ms{quantile="0.5",model="tts-1"} 1200
mastra_voice_synthesis_latency_ms{quantile="0.95",model="tts-1"} 2800
mastra_voice_synthesis_latency_ms{quantile="0.99",model="tts-1"} 4500
mastra_voice_synthesis_audio_size_bytes{quantile="0.5"} 24576
mastra_voice_synthesis_errors_total{error_type="api_timeout"} 8
mastra_voice_synthesis_errors_total{error_type="text_too_long"} 12
```

---

## Frontend Integration

### Voice Playback Component

```typescript
import { useState } from 'react';
import { toast } from 'sonner';

export function VoiceResponse({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function synthesizeAndPlay() {
    setIsPlaying(true);

    try {
      const response = await fetch('/api/mastra/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/json', // Request JSON response with audio URL
        },
        body: JSON.stringify({
          text,
          voice: 'alloy',
          options: {
            model: 'tts-1',
            speed: 1.0,
            format: 'mp3',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Synthesis failed');
      }

      const result = await response.json();
      setAudioUrl(result.audioUrl);

      // Auto-play audio
      const audio = new Audio(result.audioUrl);
      audio.play();

      audio.onended = () => {
        setIsPlaying(false);
      };

    } catch (error) {
      toast.error('Voice synthesis failed. Please try again.');
      setIsPlaying(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={synthesizeAndPlay}
        disabled={isPlaying}
        className="flex items-center gap-2"
      >
        {isPlaying ? (
          <>
            <VolumeIcon className="animate-pulse" />
            <span>Playing...</span>
          </>
        ) : (
          <>
            <PlayIcon />
            <span>Listen</span>
          </>
        )}
      </button>

      {audioUrl && (
        <audio controls className="ml-auto">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      )}
    </div>
  );
}
```

### Alternative: Direct Audio Stream

```typescript
async function synthesizeAndPlayStream() {
  const response = await fetch('/api/mastra/voice/synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      text: "Your lightest tent is the Nemo Hornet Elite at 850 grams.",
      voice: 'alloy',
    }),
  });

  // Response is audio/mpeg binary stream
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  audio.play();
}
```

---

## Complete Voice Interaction Flow

### End-to-End Latency Target

**Total Time**: < 3 seconds (90th percentile)

```
User speaks → Transcribe → Process → Synthesize → Play
    (1s)         (1.5s)      (1s)       (1.5s)     (0s)
```

**Breakdown**:
1. **Audio Capture**: ~1s (user speaks)
2. **Transcription**: ~1.5s (POST `/api/mastra/voice/transcribe`)
3. **AI Processing**: ~1s (POST `/api/mastra/chat`)
4. **Synthesis**: ~1.5s (POST `/api/mastra/voice/synthesize`)
5. **Playback**: Instant (browser auto-plays audio)

**Total**: ~5s (end-to-end)

**Optimization Strategies**:
- Use `tts-1` (not `tts-1-hd`) for real-time interactions
- Stream audio as it's generated (future enhancement)
- Preload common responses (e.g., "I don't understand")

---

## Security Considerations

1. **Authentication**: All synthesis requests require valid Supabase JWT
2. **Rate Limiting**: 40 requests/hour (combined with transcription) to prevent abuse
3. **Input Sanitization**: Text is sanitized to prevent SSML injection attacks
4. **Content Length**: Max 4096 characters to prevent cost overruns
5. **Temporary Storage**: Generated audio files expire after 1 hour

---

## Cost Optimization

### OpenAI TTS Pricing (as of 2025)

| Model | Cost per 1M chars |
|-------|-------------------|
| `tts-1` | $15.00 |
| `tts-1-hd` | $30.00 |

**Example Calculation**:
- Average response: 100 characters
- Rate limit: 40 requests/hour/user
- Cost per user per hour: $0.06 (tts-1) or $0.12 (tts-1-hd)

**Mitigation**:
- Default to `tts-1` for real-time interactions
- Cache common responses (e.g., "I don't understand", "Please wait...")
- Enforce 40/hour rate limit strictly

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial contract definition |
